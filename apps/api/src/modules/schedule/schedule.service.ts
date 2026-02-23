import { ScheduleEntry } from '@fitcalendar/db';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { addDays, format, startOfDay } from 'date-fns';
import { Between } from 'typeorm';
import { Repository } from 'typeorm';

import { ClassResponseDto } from './dto/schedule-response.dto';
import { DayScheduleDto, WeekScheduleDto } from './dto/week-schedule.dto';

@Injectable()
export class ScheduleService {
    private readonly logger = new Logger(ScheduleService.name);

    constructor(
        @InjectRepository(ScheduleEntry)
        private readonly scheduleRepository: Repository<ScheduleEntry>,
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
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            durationMinutes: entry.durationMinutes,
            status: entry.status,
            coachId: entry.coachId,
            coachName: entry.coach.name,
            coachPhotoUrl: entry.coach.photoUrl,
            difficulty: entry.trainingType.difficulty,
            impactTypes: entry.trainingType.impactTypes,
        };
    }

    /**
     * Get schedule for today
     */
    async getToday(includeCancelled = false): Promise<ClassResponseDto[]> {
        this.logger.log('Fetching today schedule');
        const today = startOfDay(new Date());
        const tomorrow = startOfDay(addDays(today, 1));

        return this.getByDateRange(today, tomorrow, includeCancelled);
    }

    /**
     * Get schedule for a specific date (YYYY-MM-DD string)
     */
    async getByDate(date: string, includeCancelled = false): Promise<ClassResponseDto[]> {
        this.logger.log(`Fetching schedule for date: ${date}`);
        const parsedDate = startOfDay(new Date(date));
        const nextDay = startOfDay(addDays(parsedDate, 1));

        return this.getByDateRange(parsedDate, nextDay, includeCancelled);
    }

    /**
     * Get weekly schedule: 7 days from today (inclusive)
     */
    async getWeek(includeCancelled = false): Promise<WeekScheduleDto> {
        this.logger.log('Fetching week schedule');
        const today = startOfDay(new Date());
        const endOfWeek = startOfDay(addDays(today, 7));

        const entries = await this.queryEntries(today, endOfWeek, includeCancelled);

        // Generate 7 days
        const days: DayScheduleDto[] = [];
        for (let i = 0; i < 7; i++) {
            const dayDate = addDays(today, i);
            const dateStr = format(dayDate, 'yyyy-MM-dd');

            const dayClasses = entries
                .filter((entry) => {
                    const entryDate = format(new Date(entry.startTime), 'yyyy-MM-dd');
                    return entryDate === dateStr;
                })
                .map((entry) => this.mapToDto(entry));

            days.push({ date: dateStr, classes: dayClasses });
        }

        return { days };
    }

    /**
     * Internal: Query entries by date range and optional status filter
     */
    private async queryEntries(start: Date, end: Date, includeCancelled: boolean): Promise<ScheduleEntry[]> {
        const whereBase = { startTime: Between(start, end) };
        const where = includeCancelled ? whereBase : { ...whereBase, status: 'scheduled' as const };

        return this.scheduleRepository.find({
            where,
            relations: ['trainingType', 'coach'],
            order: { startTime: 'ASC' },
        });
    }

    /**
     * Internal: Get entries for a date range and map to DTOs
     */
    private async getByDateRange(start: Date, end: Date, includeCancelled: boolean): Promise<ClassResponseDto[]> {
        const entries = await this.queryEntries(start, end, includeCancelled);
        return entries.map((entry) => this.mapToDto(entry));
    }
}
