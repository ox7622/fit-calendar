import { ScheduleEntry, TrainingType } from '@fitcalendar/db';
import { clampWeekOffset, DIFFICULTY_LEVEL_LABELS, formatInClubTz, type TDifficultyLevel } from '@fitcalendar/shared';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { addDays, format, startOfDay } from 'date-fns';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';
import { ArrayContains, Between, FindOptionsWhere } from 'typeorm';
import { Repository } from 'typeorm';

import { ClubService } from '../club/club.service';

import { LabelValueDto } from './dto/label-value.dto';
import { ScheduleFilterDto } from './dto/schedule-filter.dto';
import { ClassResponseDto } from './dto/schedule-response.dto';
import { TrainingTypeResponseDto } from './dto/training-type-response.dto';
import { DayScheduleDto, WeekScheduleDto } from './dto/week-schedule.dto';

@Injectable()
export class ScheduleService {
    private readonly logger = new Logger(ScheduleService.name);

    constructor(
        @InjectRepository(ScheduleEntry)
        private readonly scheduleRepository: Repository<ScheduleEntry>,
        @InjectRepository(TrainingType)
        private readonly trainingTypeRepository: Repository<TrainingType>,
        private readonly clubService: ClubService,
    ) {}

    /**
     * Map a ScheduleEntry entity to a ClassResponseDto
     */
    private mapToDto(entry: ScheduleEntry): ClassResponseDto {
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
    }

    /**
     * Get a single schedule entry by id
     */
    async getById(id: string): Promise<ClassResponseDto> {
        this.logger.log(`Fetching schedule entry: ${id}`);
        const entry = await this.scheduleRepository.findOne({
            where: { id },
            relations: ['trainingType', 'coach'],
        });

        if (!entry) {
            throw new NotFoundException(`Schedule entry with id ${id} not found`);
        }

        return this.mapToDto(entry);
    }

    /**
     * Get schedule for today
     */
    async getToday(filter: ScheduleFilterDto = {}): Promise<ClassResponseDto[]> {
        this.logger.log('Fetching today schedule');
        const tz = await this.clubService.getTimeZone();
        // Wall-clock midnight in the club zone, expressed as the real UTC instant.
        const startLocal = startOfDay(toZonedTime(new Date(), tz));
        const start = fromZonedTime(startLocal, tz);
        const end = fromZonedTime(addDays(startLocal, 1), tz);

        return this.getByDateRange(start, end, filter);
    }

    /**
     * Get schedule for a specific date (YYYY-MM-DD string)
     */
    async getByDate(date: string, filter: ScheduleFilterDto = {}): Promise<ClassResponseDto[]> {
        this.logger.log(`Fetching schedule for date: ${date}`);
        const tz = await this.clubService.getTimeZone();
        const startLocal = startOfDay(new Date(`${date}T00:00:00`));
        const start = fromZonedTime(startLocal, tz);
        const end = fromZonedTime(addDays(startLocal, 1), tz);

        return this.getByDateRange(start, end, filter);
    }

    /**
     * Get weekly schedule: 7 days from an anchor week (weekOffset 0 = current week).
     * The offset is clamped to the navigable range before anchoring.
     */
    async getWeek(filter: ScheduleFilterDto = {}, weekOffset = 0): Promise<WeekScheduleDto> {
        const offset = clampWeekOffset(weekOffset);
        this.logger.log(`Fetching week schedule (offset ${offset})`);
        const tz = await this.clubService.getTimeZone();
        // anchorLocal holds club wall-clock fields; format() reads them directly.
        const anchorLocal = startOfDay(addDays(toZonedTime(new Date(), tz), 7 * offset));
        const anchor = fromZonedTime(anchorLocal, tz);
        const endOfWeek = fromZonedTime(addDays(anchorLocal, 7), tz);

        const entries = await this.queryEntries(anchor, endOfWeek, filter);

        const days: DayScheduleDto[] = [];
        for (let i = 0; i < 7; i++) {
            const dateStr = format(addDays(anchorLocal, i), 'yyyy-MM-dd');

            const dayClasses = entries
                .filter((entry) => formatInClubTz(entry.startTime, tz, 'yyyy-MM-dd') === dateStr)
                .map((entry) => this.mapToDto(entry));

            days.push({ date: dateStr, classes: dayClasses });
        }

        return { days };
    }

    /**
     * Get all active training types (metadata)
     */
    async getTrainingTypes(): Promise<TrainingTypeResponseDto[]> {
        this.logger.log('Fetching active training types');
        const types = await this.trainingTypeRepository.find({
            where: { isActive: true },
            order: { name: 'ASC' },
        });

        return types.map((t) => ({
            id: t.id,
            name: t.name,
            description: t.description,
            difficulty: t.difficulty,
            impactTypes: t.impactTypes,
            equipment: t.equipment,
        }));
    }

    /**
     * Get difficulty levels (labels sourced from @fitcalendar/shared so the
     * mini-app filter chips render identical copy without an extra fetch).
     */
    getDifficultyLevels(): LabelValueDto[] {
        const order: TDifficultyLevel[] = ['beginner', 'intermediate', 'advanced'];
        return order.map((value) => ({ value, label: DIFFICULTY_LEVEL_LABELS[value] }));
    }

    /**
     * Get impact types (hardcoded metadata)
     */
    getImpactTypes(): LabelValueDto[] {
        return [
            { value: 'cardio', label: 'Кардио' },
            { value: 'strength', label: 'Силовая' },
            { value: 'flexibility', label: 'Гибкость' },
            { value: 'balance', label: 'Баланс' },
        ];
    }

    /**
     * Internal: Build TypeORM where conditions from filter
     */
    private buildWhere(
        start: Date,
        end: Date,
        filter: ScheduleFilterDto,
    ): FindOptionsWhere<ScheduleEntry> | FindOptionsWhere<ScheduleEntry>[] {
        const base: FindOptionsWhere<ScheduleEntry> = {
            startTime: Between(start, end),
        };

        if (!filter.includeCancelled) {
            base.status = 'scheduled';
        }

        if (filter.coachId) {
            base.coachId = filter.coachId;
        }

        if (filter.trainingTypeId) {
            base.trainingTypeId = filter.trainingTypeId;
        }

        const trainingTypeWhere: FindOptionsWhere<TrainingType> = {};

        if (filter.difficultyLevel) {
            trainingTypeWhere.difficulty = filter.difficultyLevel;
        }

        if (filter.impactType && filter.impactType.length > 0) {
            trainingTypeWhere.impactTypes = ArrayContains(filter.impactType);
        }

        if (Object.keys(trainingTypeWhere).length > 0) {
            base.trainingType = trainingTypeWhere;
        }

        return base;
    }

    /**
     * Internal: Query entries by date range and optional filter
     */
    private async queryEntries(start: Date, end: Date, filter: ScheduleFilterDto): Promise<ScheduleEntry[]> {
        const where = this.buildWhere(start, end, filter);

        return this.scheduleRepository.find({
            where,
            relations: ['trainingType', 'coach'],
            order: { startTime: 'ASC' },
        });
    }

    /**
     * Internal: Get entries for a date range and map to DTOs
     */
    private async getByDateRange(start: Date, end: Date, filter: ScheduleFilterDto): Promise<ClassResponseDto[]> {
        const entries = await this.queryEntries(start, end, filter);
        return entries.map((entry) => this.mapToDto(entry));
    }
}
