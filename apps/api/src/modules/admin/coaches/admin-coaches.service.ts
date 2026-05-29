import { Coach, ScheduleEntry } from '@fitcalendar/db';
import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AdminAuditService } from '../audit';
import type { IAuditContext } from '../audit/audit-context';
import { CloudinaryService } from '../uploads/cloudinary.service';

import { CoachDto, CoachOptionDto, toCoachDto } from './dto/coach.dto';
import { CreateCoachDto } from './dto/create-coach.dto';
import { UpdateCoachDto } from './dto/update-coach.dto';

@Injectable()
export class AdminCoachesService {
    private readonly logger = new Logger(AdminCoachesService.name);

    constructor(
        @InjectRepository(Coach)
        private readonly coachRepo: Repository<Coach>,
        @InjectRepository(ScheduleEntry)
        private readonly scheduleRepo: Repository<ScheduleEntry>,
        private readonly cloudinary: CloudinaryService,
        private readonly auditService: AdminAuditService,
    ) {}

    async findAll(): Promise<CoachDto[]> {
        const coaches = await this.coachRepo.find({ order: { name: 'ASC' } });
        return coaches.map(toCoachDto);
    }

    async findOptions(): Promise<CoachOptionDto[]> {
        const coaches = await this.coachRepo.find({
            where: { isActive: true },
            order: { name: 'ASC' },
            select: ['id', 'name'],
        });
        return coaches.map((c) => ({ id: c.id, name: c.name }));
    }

    async findById(id: string): Promise<CoachDto> {
        const coach = await this.coachRepo.findOne({ where: { id } });
        if (!coach) {
            throw new NotFoundException(`Coach ${id} not found`);
        }
        return toCoachDto(coach);
    }

    async create(dto: CreateCoachDto): Promise<CoachDto> {
        const coach = this.coachRepo.create({
            name: dto.name,
            bio: dto.bio ?? null,
            specializations: dto.specializations,
            certifications: dto.certifications,
            isActive: dto.isActive ?? true,
            photoUrl: null,
        });
        const saved = await this.coachRepo.save(coach);
        this.logger.log(`Created coach ${saved.id}`);
        return toCoachDto(saved);
    }

    async update(id: string, dto: UpdateCoachDto): Promise<CoachDto> {
        const coach = await this.coachRepo.findOne({ where: { id } });
        if (!coach) {
            throw new NotFoundException(`Coach ${id} not found`);
        }
        if (dto.name !== undefined) coach.name = dto.name;
        if (dto.bio !== undefined) coach.bio = dto.bio;
        if (dto.specializations !== undefined) coach.specializations = dto.specializations;
        if (dto.certifications !== undefined) coach.certifications = dto.certifications;
        if (dto.isActive !== undefined) coach.isActive = dto.isActive;
        const saved = await this.coachRepo.save(coach);
        return toCoachDto(saved);
    }

    async setPhoto(id: string, fileBuffer: Buffer): Promise<{ photoUrl: string }> {
        const coach = await this.coachRepo.findOne({ where: { id } });
        if (!coach) {
            throw new NotFoundException(`Coach ${id} not found`);
        }
        const photoUrl = await this.cloudinary.uploadCoachPhoto(fileBuffer, id);
        coach.photoUrl = photoUrl;
        await this.coachRepo.save(coach);
        this.logger.log(`Uploaded photo for coach ${id}`);
        return { photoUrl };
    }

    /**
     * Hard delete is allowed only when the coach owns zero schedule entries
     * (past or future). Existing entries would either break FK integrity or
     * cascade-delete attendance history — both unacceptable, so the admin
     * is forced to deactivate (AC7) instead.
     */
    async deleteCoach(id: string, audit?: IAuditContext): Promise<void> {
        const coach = await this.coachRepo.findOne({ where: { id } });
        if (!coach) {
            throw new NotFoundException(`Coach ${id} not found`);
        }
        const entryCount = await this.scheduleRepo.count({ where: { coachId: id } });
        if (entryCount > 0) {
            throw new ConflictException('Тренер не может быть удалён: есть занятия. Используйте деактивацию.');
        }
        const snapshot = { name: coach.name };
        await this.coachRepo.remove(coach);
        this.logger.log(`Deleted coach ${id}`);
        await this.auditService.record({
            adminUserId: audit?.adminUserId ?? null,
            ipAddress: audit?.ipAddress ?? null,
            action: 'delete_coach',
            resourceType: 'coach',
            resourceId: id,
            metadata: snapshot,
        });
    }

    /**
     * Story 6.5 frontend uses this to decide whether the delete button is enabled.
     * Exposed as a separate query so the list/edit pages don't have to refetch
     * the whole coach record just to read the count.
     */
    countScheduleEntries(id: string): Promise<number> {
        return this.scheduleRepo.count({ where: { coachId: id } });
    }
}
