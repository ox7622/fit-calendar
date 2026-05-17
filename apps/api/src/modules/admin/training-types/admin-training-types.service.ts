import { ScheduleEntry, TrainingType } from '@fitcalendar/db';
import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

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
     * Same shape as Story 6.5 coach deletion: zero ScheduleEntry references
     * required, else 409. Existing classes inheriting this type's metadata
     * are not auto-cleaned — see Story 6.6 Dev Notes "Why we don't propagate
     * metadata changes to existing schedule entries".
     */
    async deleteType(id: string): Promise<void> {
        const type = await this.typeRepo.findOne({ where: { id } });
        if (!type) throw new NotFoundException(`TrainingType ${id} not found`);
        const entryCount = await this.scheduleRepo.count({ where: { trainingTypeId: id } });
        if (entryCount > 0) {
            throw new ConflictException('Тип не может быть удалён: есть занятия. Используйте деактивацию.');
        }
        await this.typeRepo.remove(type);
        this.logger.log(`Deleted training type ${id}`);
    }
}
