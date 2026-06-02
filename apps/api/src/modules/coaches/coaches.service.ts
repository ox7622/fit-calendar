import { Coach, ScheduleEntry } from '@fitcalendar/db';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { addDays, startOfDay } from 'date-fns';
import { Between } from 'typeorm';
import { Repository } from 'typeorm';

import { ClassResponseDto } from '../schedule/dto/schedule-response.dto';

import { CoachDetailDto } from './dto/coach-detail.dto';
import { CoachSummaryDto } from './dto/coach-summary.dto';

@Injectable()
export class CoachesService {
    private readonly logger = new Logger(CoachesService.name);

    constructor(
        @InjectRepository(Coach)
        private readonly coachRepository: Repository<Coach>,
        @InjectRepository(ScheduleEntry)
        private readonly scheduleRepository: Repository<ScheduleEntry>,
    ) {}

    async findAll(): Promise<CoachSummaryDto[]> {
        this.logger.log('Fetching all active coaches');
        const coaches = await this.coachRepository.find({
            where: { isActive: true },
            order: { name: 'ASC' },
        });

        return coaches.map((coach) => ({
            id: coach.id,
            name: coach.name,
            photoUrl: coach.photoUrl,
            specializations: coach.specializations,
        }));
    }

    async findById(id: string): Promise<CoachDetailDto> {
        this.logger.log(`Fetching coach: ${id}`);
        const coach = await this.coachRepository.findOne({
            where: { id, isActive: true },
        });

        if (!coach) {
            throw new NotFoundException(`Coach with id ${id} not found`);
        }

        return {
            id: coach.id,
            name: coach.name,
            bio: coach.bio,
            photoUrl: coach.photoUrl,
            specializations: coach.specializations,
            certifications: coach.certifications,
        };
    }

    async getCoachSchedule(coachId: string): Promise<ClassResponseDto[]> {
        this.logger.log(`Fetching schedule for coach: ${coachId}`);

        // Verify coach exists
        const coach = await this.coachRepository.findOne({
            where: { id: coachId, isActive: true },
        });

        if (!coach) {
            throw new NotFoundException(`Coach with id ${coachId} not found`);
        }

        const now = startOfDay(new Date());
        const endDate = startOfDay(addDays(now, 7));

        const entries = await this.scheduleRepository.find({
            where: {
                coachId,
                status: 'scheduled',
                startTime: Between(now, endDate),
            },
            relations: ['trainingType', 'coach'],
            order: { startTime: 'ASC' },
        });

        return entries.map((entry) => {
            const startTime = new Date(entry.startTime);
            const endTime = new Date(startTime.getTime() + entry.durationMinutes * 60 * 1000);

            return {
                id: entry.id,
                name: entry.trainingType.name,
                description: entry.trainingType.description,
                startTime: startTime.toISOString(),
                endTime: endTime.toISOString(),
                durationMinutes: entry.durationMinutes,
                status: entry.status,
                coachId: entry.coachId,
                coachName: entry.coach.name,
                coachPhotoUrl: entry.coach.photoUrl,
                difficulty: entry.trainingType.difficulty,
                impactTypes: entry.trainingType.impactTypes,
                equipment: entry.trainingType.equipment,
            };
        });
    }
}
