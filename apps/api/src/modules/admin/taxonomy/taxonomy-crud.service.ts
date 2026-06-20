import type { TAdminAuditAction } from '@fitcalendar/db';
import { ConflictException, Logger, NotFoundException } from '@nestjs/common';
import type { DeepPartial, ObjectLiteral, Repository } from 'typeorm';

import type { AdminAuditService } from '../audit';
import type { IAuditContext } from '../audit/audit-context';

import type { CreateTaxonomyDto } from './dto/create-taxonomy.dto';
import type { TMoveDirection } from './dto/move-taxonomy.dto';
import type { PublicTaxonomyItemDto, TaxonomyItemDto } from './dto/taxonomy-item.dto';
import { toTaxonomyItemDto, type ITaxonomyEntity } from './dto/taxonomy-item.dto';
import type { UpdateTaxonomyDto } from './dto/update-taxonomy.dto';
import { slugify } from './slugify';

/**
 * The public surface the controllers depend on — independent of the entity
 * generic, so a `TaxonomyControllerBase` can hold any concrete taxonomy service
 * without running into generic-variance issues.
 */
export interface ITaxonomyService {
    findAll(): Promise<TaxonomyItemDto[]>;
    findActivePublic(): Promise<PublicTaxonomyItemDto[]>;
    create(dto: CreateTaxonomyDto): Promise<TaxonomyItemDto>;
    update(id: string, dto: UpdateTaxonomyDto): Promise<TaxonomyItemDto>;
    move(id: string, direction: TMoveDirection): Promise<TaxonomyItemDto[]>;
    deleteItem(id: string, audit?: IAuditContext): Promise<void>;
}

export interface ITaxonomyCrudOptions {
    /** Audit `resourceType` + human label for NotFound messages. */
    resourceType: string;
    /** Audit action recorded on hard-delete. */
    deleteAuditAction: TAdminAuditAction;
    /** Russian noun for the in-use 409 message, e.g. 'уровень', 'тип нагрузки'. */
    inUseNoun: string;
}

/**
 * Shared CRUD for the two taxonomy tables (difficulty levels, impact types) —
 * identical except for the repository and how a key's usage is counted. Order
 * is an explicit `sortOrder` managed with up/down moves; deletion is blocked
 * while any training type still references the key.
 */
export abstract class TaxonomyCrudService<T extends ITaxonomyEntity & ObjectLiteral> implements ITaxonomyService {
    protected readonly logger = new Logger(this.constructor.name);

    protected constructor(
        protected readonly repo: Repository<T>,
        protected readonly auditService: AdminAuditService,
        private readonly opts: ITaxonomyCrudOptions,
    ) {}

    /** How many training types reference this key (gates deletion). */
    protected abstract countReferences(key: string): Promise<number>;

    async findAll(): Promise<TaxonomyItemDto[]> {
        const rows = await this.repo.find({ order: { sortOrder: 'ASC', label: 'ASC' } as never });
        return rows.map(toTaxonomyItemDto);
    }

    /** Active-only, lean shape for the public `/taxonomy` (mini-app). */
    async findActivePublic(): Promise<PublicTaxonomyItemDto[]> {
        const rows = await this.repo.find({
            where: { isActive: true } as never,
            order: { sortOrder: 'ASC', label: 'ASC' } as never,
        });
        return rows.map((r) => {
            const e = r as unknown as ITaxonomyEntity;
            return { key: e.key, label: e.label, color: e.color, sortOrder: e.sortOrder };
        });
    }

    async create(dto: CreateTaxonomyDto): Promise<TaxonomyItemDto> {
        const key = await this.generateUniqueKey(dto.label);
        const max = await this.repo
            .createQueryBuilder('e')
            .select('COALESCE(MAX(e.sortOrder), -1)', 'max')
            .getRawOne<{ max: number }>();
        const sortOrder = Number(max?.max ?? -1) + 1;

        const entity = this.repo.create({
            key,
            label: dto.label,
            color: dto.color,
            sortOrder,
            isActive: dto.isActive ?? true,
        } as DeepPartial<T>);
        const saved = await this.repo.save(entity);
        this.logger.log(`Created ${this.opts.resourceType} ${(saved as ITaxonomyEntity).id} (${key})`);
        return toTaxonomyItemDto(saved as unknown as ITaxonomyEntity);
    }

    async update(id: string, dto: UpdateTaxonomyDto): Promise<TaxonomyItemDto> {
        const entity = await this.findOrThrow(id);
        if (dto.label !== undefined) entity.label = dto.label;
        if (dto.color !== undefined) entity.color = dto.color;
        if (dto.isActive !== undefined) entity.isActive = dto.isActive;
        const saved = await this.repo.save(entity as unknown as DeepPartial<T>);
        return toTaxonomyItemDto(saved as unknown as ITaxonomyEntity);
    }

    /** Swap sortOrder with the adjacent row in the requested direction (no-op at the edge). */
    async move(id: string, direction: TMoveDirection): Promise<TaxonomyItemDto[]> {
        const current = await this.findOrThrow(id);
        const neighbor = await this.repo
            .createQueryBuilder('e')
            .where(direction === 'up' ? 'e.sortOrder < :order' : 'e.sortOrder > :order', { order: current.sortOrder })
            .orderBy('e.sortOrder', direction === 'up' ? 'DESC' : 'ASC')
            .getOne();

        if (neighbor) {
            const neighborEntity = neighbor as unknown as ITaxonomyEntity;
            const tmp = current.sortOrder;
            current.sortOrder = neighborEntity.sortOrder;
            neighborEntity.sortOrder = tmp;
            await this.repo.save([current, neighborEntity] as unknown as DeepPartial<T>[]);
        }
        return this.findAll();
    }

    async deleteItem(id: string, audit?: IAuditContext): Promise<void> {
        const entity = await this.findOrThrow(id);
        const refs = await this.countReferences(entity.key);
        if (refs > 0) {
            throw new ConflictException(
                `Нельзя удалить: ${this.opts.inUseNoun} используется в ${refs} типах занятий. Сначала переназначьте.`,
            );
        }
        await this.repo.remove(entity as unknown as T);
        this.logger.log(`Deleted ${this.opts.resourceType} ${id} (${entity.key})`);
        await this.auditService.record({
            adminUserId: audit?.adminUserId ?? null,
            ipAddress: audit?.ipAddress ?? null,
            action: this.opts.deleteAuditAction,
            resourceType: this.opts.resourceType,
            resourceId: id,
            metadata: { key: entity.key, label: entity.label },
        });
    }

    private async findOrThrow(id: string): Promise<ITaxonomyEntity> {
        const entity = await this.repo.findOne({ where: { id } as never });
        if (!entity) {
            throw new NotFoundException(`${this.opts.resourceType} ${id} not found`);
        }
        return entity as unknown as ITaxonomyEntity;
    }

    private async generateUniqueKey(label: string): Promise<string> {
        const base = slugify(label) || `item-${Date.now().toString(36)}`;
        let candidate = base;
        let suffix = 2;
        // Keys are few; a per-candidate existence check is fine.
        while (await this.repo.findOne({ where: { key: candidate } as never })) {
            candidate = `${base}-${suffix}`;
            suffix += 1;
        }
        return candidate;
    }
}
