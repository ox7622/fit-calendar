import { DifficultyLevel, ImpactType, ScheduleEntry, TrainingType } from '@fitcalendar/db';
import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { AdminAuditService } from '../audit';
import type { IAuditContext } from '../audit/audit-context';

import { CreateTrainingTypeDto } from './dto/create-training-type.dto';
import { TrainingTypeDto, TrainingTypeOptionDto, toTrainingTypeDto } from './dto/training-type.dto';
import { UpdateTrainingTypeDto } from './dto/update-training-type.dto';

@Injectable()
export class AdminTrainingTypesService {
    private readonly logger = new Logger(AdminTrainingTypesService.name);

    constructor(
        @InjectRepository(TrainingType)
        private readonly typeRepo: Repository<TrainingType>,
        @InjectRepository(ScheduleEntry)
        private readonly scheduleRepo: Repository<ScheduleEntry>,
        @InjectRepository(DifficultyLevel)
        private readonly difficultyRepo: Repository<DifficultyLevel>,
        @InjectRepository(ImpactType)
        private readonly impactRepo: Repository<ImpactType>,
        private readonly auditService: AdminAuditService,
    ) {}

    async findAll(): Promise<TrainingTypeDto[]> {
        const types = await this.typeRepo.find({ order: { name: 'ASC' } });
        return types.map(toTrainingTypeDto);
    }

    async findOptions(): Promise<TrainingTypeOptionDto[]> {
        const types = await this.typeRepo.find({
            where: { isActive: true },
            order: { name: 'ASC' },
            select: ['id', 'name'],
        });
        return types.map((t) => ({ id: t.id, name: t.name }));
    }

    async findById(id: string): Promise<TrainingTypeDto> {
        const type = await this.typeRepo.findOne({ where: { id } });
        if (!type) throw new NotFoundException(`TrainingType ${id} not found`);
        return toTrainingTypeDto(type);
    }

    async create(dto: CreateTrainingTypeDto): Promise<TrainingTypeDto> {
        await this.assertValidTaxonomy(dto.difficulty, dto.impactTypes);
        const type = this.typeRepo.create({
            name: dto.name,
            description: dto.description ?? null,
            difficulty: dto.difficulty,
            impactTypes: dto.impactTypes,
            equipment: dto.equipment,
            isActive: dto.isActive ?? true,
        });
        const saved = await this.typeRepo.save(type);
        this.logger.log(`Created training type ${saved.id}`);
        return toTrainingTypeDto(saved);
    }

    async update(id: string, dto: UpdateTrainingTypeDto): Promise<TrainingTypeDto> {
        const type = await this.typeRepo.findOne({ where: { id } });
        if (!type) throw new NotFoundException(`TrainingType ${id} not found`);
        await this.assertValidTaxonomy(dto.difficulty, dto.impactTypes);
        if (dto.name !== undefined) type.name = dto.name;
        if (dto.description !== undefined) type.description = dto.description;
        if (dto.difficulty !== undefined) type.difficulty = dto.difficulty;
        if (dto.impactTypes !== undefined) type.impactTypes = dto.impactTypes;
        if (dto.equipment !== undefined) type.equipment = dto.equipment;
        if (dto.isActive !== undefined) type.isActive = dto.isActive;
        const saved = await this.typeRepo.save(type);
        return toTrainingTypeDto(saved);
    }

    /**
     * Validate that the referenced taxonomy keys exist and are active. Replaces
     * the old static `@IsIn` DTO check now that difficulty/impact are admin-managed.
     * `undefined` (on update) means "unchanged" and is skipped.
     */
    private async assertValidTaxonomy(difficulty?: string, impactTypes?: string[]): Promise<void> {
        // The two checks are independent — run them together.
        const [level, foundImpacts] = await Promise.all([
            difficulty !== undefined
                ? this.difficultyRepo.findOne({ where: { key: difficulty, isActive: true } })
                : null,
            impactTypes !== undefined && impactTypes.length > 0
                ? this.impactRepo.find({ where: { key: In(impactTypes), isActive: true } })
                : [],
        ]);

        if (difficulty !== undefined && !level) {
            throw new BadRequestException(`Уровень сложности «${difficulty}» не найден или неактивен`);
        }
        if (impactTypes !== undefined && impactTypes.length > 0) {
            const foundKeys = new Set(foundImpacts.map((t) => t.key));
            const missing = impactTypes.filter((k) => !foundKeys.has(k));
            if (missing.length > 0) {
                throw new BadRequestException(`Типы нагрузки не найдены или неактивны: ${missing.join(', ')}`);
            }
        }
    }

    /**
     * Same shape as Story 6.5 coach deletion: zero ScheduleEntry references
     * required, else 409. Existing classes inheriting this type's metadata
     * are not auto-cleaned — see Story 6.6 Dev Notes "Why we don't propagate
     * metadata changes to existing schedule entries".
     */
    async deleteType(id: string, audit?: IAuditContext): Promise<void> {
        const type = await this.typeRepo.findOne({ where: { id } });
        if (!type) throw new NotFoundException(`TrainingType ${id} not found`);
        const entryCount = await this.scheduleRepo.count({ where: { trainingTypeId: id } });
        if (entryCount > 0) {
            throw new ConflictException('Тип не может быть удалён: есть занятия. Используйте деактивацию.');
        }
        const snapshot = { name: type.name };
        await this.typeRepo.remove(type);
        this.logger.log(`Deleted training type ${id}`);
        await this.auditService.record({
            adminUserId: audit?.adminUserId ?? null,
            ipAddress: audit?.ipAddress ?? null,
            action: 'delete_training_type',
            resourceType: 'training_type',
            resourceId: id,
            metadata: snapshot,
        });
    }
}
