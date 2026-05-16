import { Coach, ScheduleEntry, TrainingType } from '@fitcalendar/db';
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { addDays, startOfWeek } from 'date-fns';
import { Repository } from 'typeorm';

import { ReminderService } from '../../reminder/reminder.service';

import { AdminScheduleItemDto, AdminScheduleListResponseDto, toAdminScheduleItem } from './dto/admin-schedule-list.dto';
import { AdminScheduleQueryDto } from './dto/admin-schedule-query.dto';
import { CreateScheduleEntryDto } from './dto/create-schedule-entry.dto';
import { UpdateScheduleEntryDto } from './dto/update-schedule-entry.dto';
import { IScheduleChangedPayload, SCHEDULE_CHANGED_EVENT } from './schedule.events';

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;
const DEFAULT_RANGE_DAYS = 14;

@Injectable()
export class AdminScheduleService {
    private readonly logger = new Logger(AdminScheduleService.name);

    constructor(
        @InjectRepository(ScheduleEntry)
        private readonly scheduleRepo: Repository<ScheduleEntry>,
        @InjectRepository(Coach)
        private readonly coachRepo: Repository<Coach>,
        @InjectRepository(TrainingType)
        private readonly trainingTypeRepo: Repository<TrainingType>,
        private readonly eventEmitter: EventEmitter2,
        private readonly reminderService: ReminderService,
    ) {}

    async findAll(query: AdminScheduleQueryDto): Promise<AdminScheduleListResponseDto> {
        const { from, to } = this.resolveRange(query);
        const page = Math.max(1, query.page ?? 1);
        const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, query.pageSize ?? DEFAULT_PAGE_SIZE));

        const qb = this.scheduleRepo
            .createQueryBuilder('e')
            .innerJoinAndSelect('e.coach', 'c')
            .innerJoinAndSelect('e.trainingType', 't')
            .where('e.startTime BETWEEN :from AND :to', { from, to });

        if (query.coachId) {
            qb.andWhere('e.coachId = :coachId', { coachId: query.coachId });
        }
        if (query.trainingTypeId) {
            qb.andWhere('e.trainingTypeId = :trainingTypeId', { trainingTypeId: query.trainingTypeId });
        }
        if (query.status && query.status !== 'all') {
            qb.andWhere('e.status = :status', { status: query.status });
        }

        qb.orderBy('e.startTime', 'ASC')
            .skip((page - 1) * pageSize)
            .take(pageSize);

        const [items, total] = await qb.getManyAndCount();

        return {
            items: items.map(toAdminScheduleItem),
            total,
            page,
            pageSize,
        };
    }

    async findById(id: string): Promise<AdminScheduleItemDto> {
        const entry = await this.scheduleRepo.findOne({
            where: { id },
            relations: ['coach', 'trainingType'],
        });
        if (!entry) {
            throw new NotFoundException(`Schedule entry ${id} not found`);
        }
        return toAdminScheduleItem(entry);
    }

    async create(dto: CreateScheduleEntryDto): Promise<AdminScheduleItemDto> {
        await this.assertActiveCoach(dto.coachId);
        await this.assertActiveTrainingType(dto.trainingTypeId);

        const entry = this.scheduleRepo.create({
            coachId: dto.coachId,
            trainingTypeId: dto.trainingTypeId,
            startTime: dto.startTime,
            durationMinutes: dto.durationMinutes,
            status: 'scheduled',
        });
        const saved = await this.scheduleRepo.save(entry);
        const reloaded = await this.scheduleRepo.findOne({
            where: { id: saved.id },
            relations: ['coach', 'trainingType'],
        });
        this.logger.log(`Created schedule entry ${saved.id}`);
        // Reload guaranteed because we just saved it.
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return toAdminScheduleItem(reloaded!);
    }

    /**
     * Story 6.3 — the update flow has three side-effects beyond persisting the row:
     *
     *   1. If `startTime` or `durationMinutes` changes, emit SCHEDULE_CHANGED_EVENT
     *      so Story 5.4's listener notifies subscribers.
     *   2. If `startTime` changes, recompute notifyAt on every pending reminder
     *      for this class (synchronous — admin's save must leave the system in a
     *      consistent state before returning).
     *   3. `status` is read-only here — cancellation goes through Story 6.4.
     */
    async update(id: string, dto: UpdateScheduleEntryDto): Promise<AdminScheduleItemDto> {
        const existing = await this.scheduleRepo.findOne({ where: { id } });
        if (!existing) {
            throw new NotFoundException(`Schedule entry ${id} not found`);
        }

        if (dto.coachId !== undefined && dto.coachId !== existing.coachId) {
            await this.assertActiveCoach(dto.coachId);
            existing.coachId = dto.coachId;
        }
        if (dto.trainingTypeId !== undefined && dto.trainingTypeId !== existing.trainingTypeId) {
            await this.assertActiveTrainingType(dto.trainingTypeId);
            existing.trainingTypeId = dto.trainingTypeId;
        }

        const oldStartTime = existing.startTime;
        const oldDurationMinutes = existing.durationMinutes;
        const newStartTime = dto.startTime ?? existing.startTime;
        const newDurationMinutes = dto.durationMinutes ?? existing.durationMinutes;

        const startTimeChanged = newStartTime.getTime() !== oldStartTime.getTime();
        const durationChanged = newDurationMinutes !== oldDurationMinutes;

        existing.startTime = newStartTime;
        existing.durationMinutes = newDurationMinutes;

        await this.scheduleRepo.save(existing);

        if (startTimeChanged) {
            // Recompute reminders synchronously; if this throws, log and keep going —
            // partial-failure mode is documented in the story Dev Notes.
            try {
                await this.reminderService.recomputeNotifyAtForClass(id, newStartTime);
            } catch (err) {
                this.logger.error({ scheduleEntryId: id, err }, 'Failed to recompute pending reminders after edit');
            }
        }

        if (startTimeChanged || durationChanged) {
            const payload: IScheduleChangedPayload = {
                scheduleEntryId: id,
                oldStartTime,
                newStartTime,
                oldDurationMinutes,
                newDurationMinutes,
            };
            this.eventEmitter.emit(SCHEDULE_CHANGED_EVENT, payload);
        }

        const reloaded = await this.scheduleRepo.findOne({
            where: { id },
            relations: ['coach', 'trainingType'],
        });
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return toAdminScheduleItem(reloaded!);
    }

    private async assertActiveCoach(coachId: string): Promise<void> {
        const coach = await this.coachRepo.findOne({ where: { id: coachId } });
        if (!coach || !coach.isActive) {
            throw new BadRequestException(`Coach ${coachId} not found or inactive`);
        }
    }

    private async assertActiveTrainingType(trainingTypeId: string): Promise<void> {
        const trainingType = await this.trainingTypeRepo.findOne({ where: { id: trainingTypeId } });
        if (!trainingType || !trainingType.isActive) {
            throw new BadRequestException(`TrainingType ${trainingTypeId} not found or inactive`);
        }
    }

    private resolveRange(query: AdminScheduleQueryDto): { from: Date; to: Date } {
        // Default: this week Monday → +14 days. Russian week starts Monday
        // (weekStartsOn: 1) — matches the front-end-spec convention.
        const now = new Date();
        const from = query.from ? new Date(query.from) : startOfWeek(now, { weekStartsOn: 1 });
        const to = query.to ? new Date(query.to) : addDays(from, DEFAULT_RANGE_DAYS);
        return { from, to };
    }
}
