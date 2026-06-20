import { DurationOption } from '@fitcalendar/db';
import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';

import { CreateDurationOptionDto, DurationOptionDto, UpdateDurationOptionDto } from './dto/duration-option.dto';
import type { TMoveDirection } from './dto/move-taxonomy.dto';

function toDto(e: DurationOption): DurationOptionDto {
    return {
        id: e.id,
        valueMinutes: e.valueMinutes,
        sortOrder: e.sortOrder,
        isActive: e.isActive,
        createdAt: e.createdAt,
        updatedAt: e.updatedAt,
    };
}

/** Translate the unique-index violation on `valueMinutes` into a friendly 409. */
function rethrowAsDuplicate(err: unknown, value: number): never {
    if (err instanceof QueryFailedError && /idx_duration_options_value/.test(err.message)) {
        throw new ConflictException(`Длительность ${value} мин уже добавлена`);
    }
    throw err;
}

/**
 * Standalone — does NOT extend TaxonomyCrudService (no label/colour/key, and
 * schedule entries hold raw `durationMinutes` ints rather than FKs, so removing
 * an option here never breaks existing classes; no reference-count gate needed).
 */
@Injectable()
export class DurationOptionsService {
    private readonly logger = new Logger(DurationOptionsService.name);

    constructor(@InjectRepository(DurationOption) private readonly repo: Repository<DurationOption>) {}

    async findAll(): Promise<DurationOptionDto[]> {
        const rows = await this.repo.find({ order: { sortOrder: 'ASC', valueMinutes: 'ASC' } });
        return rows.map(toDto);
    }

    async create(dto: CreateDurationOptionDto): Promise<DurationOptionDto> {
        const max = await this.repo
            .createQueryBuilder('e')
            .select('COALESCE(MAX(e.sortOrder), -1)', 'max')
            .getRawOne<{ max: number }>();
        const sortOrder = Number(max?.max ?? -1) + 1;

        try {
            const saved = await this.repo.save(
                this.repo.create({
                    valueMinutes: dto.valueMinutes,
                    sortOrder,
                    isActive: dto.isActive ?? true,
                }),
            );
            this.logger.log(`Created duration_option ${saved.id} (${saved.valueMinutes} min)`);
            return toDto(saved);
        } catch (err) {
            rethrowAsDuplicate(err, dto.valueMinutes);
        }
    }

    async update(id: string, dto: UpdateDurationOptionDto): Promise<DurationOptionDto> {
        const entity = await this.findOrThrow(id);
        if (dto.valueMinutes !== undefined) entity.valueMinutes = dto.valueMinutes;
        if (dto.isActive !== undefined) entity.isActive = dto.isActive;
        try {
            const saved = await this.repo.save(entity);
            return toDto(saved);
        } catch (err) {
            rethrowAsDuplicate(err, entity.valueMinutes);
        }
    }

    async move(id: string, direction: TMoveDirection): Promise<DurationOptionDto[]> {
        const current = await this.findOrThrow(id);
        const neighbor = await this.repo
            .createQueryBuilder('e')
            .where(direction === 'up' ? 'e.sortOrder < :order' : 'e.sortOrder > :order', { order: current.sortOrder })
            .orderBy('e.sortOrder', direction === 'up' ? 'DESC' : 'ASC')
            .getOne();
        if (neighbor) {
            const tmp = current.sortOrder;
            current.sortOrder = neighbor.sortOrder;
            neighbor.sortOrder = tmp;
            await this.repo.save([current, neighbor]);
        }
        return this.findAll();
    }

    async remove(id: string): Promise<void> {
        const entity = await this.findOrThrow(id);
        await this.repo.remove(entity);
        this.logger.log(`Deleted duration_option ${id} (${entity.valueMinutes} min)`);
    }

    private async findOrThrow(id: string): Promise<DurationOption> {
        const entity = await this.repo.findOne({ where: { id } });
        if (!entity) throw new NotFoundException(`duration_option ${id} not found`);
        return entity;
    }
}
