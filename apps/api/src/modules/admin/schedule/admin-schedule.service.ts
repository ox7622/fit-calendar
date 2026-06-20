import { Coach, ScheduleEntry, TrainingType } from '@fitcalendar/db';
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { addDays, startOfWeek } from 'date-fns';
import { DataSource, In, Repository } from 'typeorm';

import { ReminderService } from '../../reminder/reminder.service';
import { AdminAuditService } from '../audit';
import type { IAuditContext } from '../audit/audit-context';

import { AdminScheduleItemDto, AdminScheduleListResponseDto, toAdminScheduleItem } from './dto/admin-schedule-list.dto';
import { AdminScheduleQueryDto } from './dto/admin-schedule-query.dto';
import { BulkCreateResponseDto, BulkCreateScheduleDto } from './dto/bulk-create-schedule.dto';
import { BulkDeleteResponseDto, SkippedDeleteDto } from './dto/bulk-delete-schedule.dto';
import { CreateScheduleEntryDto } from './dto/create-schedule-entry.dto';
import { UpdateScheduleEntryDto } from './dto/update-schedule-entry.dto';
import {
    IScheduleCancelledPayload,
    IScheduleChangedPayload,
    IScheduleCreatedPayload,
    IScheduleDeletedPayload,
    SCHEDULE_CANCELLED_EVENT,
    SCHEDULE_CHANGED_EVENT,
    SCHEDULE_CREATED_EVENT,
    SCHEDULE_DELETED_EVENT,
} from './schedule.events';

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
        @InjectDataSource()
        private readonly dataSource: DataSource,
        private readonly eventEmitter: EventEmitter2,
        private readonly reminderService: ReminderService,
        private readonly auditService: AdminAuditService,
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
        const item = reloaded!;
        const createdPayload: IScheduleCreatedPayload = {
            scheduleEntryId: item.id,
            snapshot: {
                className: item.trainingType.name,
                coachName: item.coach.name,
                startTime: item.startTime,
            },
        };
        this.eventEmitter.emit(SCHEDULE_CREATED_EVENT, createdPayload);
        return toAdminScheduleItem(item);
    }

    /**
     * Bulk-create independent schedule entries (copy week / copy class / recurrence).
     * Duplicates are NOT checked — overlapping slots are allowed by design. Validates
     * each distinct coach/type once BEFORE the transaction so a bad reference fails
     * fast and nothing is written. No reminders/events (same as single `create`).
     */
    async bulkCreate(dto: BulkCreateScheduleDto): Promise<BulkCreateResponseDto> {
        const coachIds = [...new Set(dto.entries.map((e) => e.coachId))];
        const typeIds = [...new Set(dto.entries.map((e) => e.trainingTypeId))];

        // Validate every distinct coach/type in one query each (before the
        // transaction) so a bad reference fails fast and nothing is written.
        const [coaches, types] = await Promise.all([
            this.coachRepo.find({ where: { id: In(coachIds) } }),
            this.trainingTypeRepo.find({ where: { id: In(typeIds) } }),
        ]);
        const coachById = new Map(coaches.map((c) => [c.id, c]));
        const typeById = new Map(types.map((t) => [t.id, t]));
        this.assertAllActive(coachIds, coachById, 'Coach');
        this.assertAllActive(typeIds, typeById, 'TrainingType');

        const rows = dto.entries.map((e) =>
            this.scheduleRepo.create({
                coachId: e.coachId,
                trainingTypeId: e.trainingTypeId,
                startTime: e.startTime,
                durationMinutes: e.durationMinutes,
                status: 'scheduled',
            }),
        );

        const saved: ScheduleEntry[] = await this.dataSource.transaction((manager) =>
            manager.save(ScheduleEntry, rows),
        );

        // Build the response from the coach/type entities already loaded for
        // validation — no need to re-SELECT the rows we just inserted.
        const items = saved.map((row) =>
            toAdminScheduleItem({
                ...row,
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                coach: coachById.get(row.coachId)!,
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                trainingType: typeById.get(row.trainingTypeId)!,
            }),
        );
        this.logger.log(`Bulk-created ${items.length} schedule entries`);
        return { created: items.length, items };
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

        const reloaded = await this.scheduleRepo.findOne({
            where: { id },
            relations: ['coach', 'trainingType'],
        });

        if (startTimeChanged || durationChanged) {
            const payload: IScheduleChangedPayload = {
                scheduleEntryId: id,
                oldStartTime,
                newStartTime,
                oldDurationMinutes,
                newDurationMinutes,
                snapshot: {
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    className: reloaded!.trainingType.name,
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    coachName: reloaded!.coach.name,
                    startTime: newStartTime,
                },
            };
            this.eventEmitter.emit(SCHEDULE_CHANGED_EVENT, payload);
        }

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return toAdminScheduleItem(reloaded!);
    }

    /**
     * Story 6.4 — cancel a class. Idempotent: re-cancelling returns the
     * existing record without re-emitting the event or re-deleting reminders.
     *
     * Side-effects on the `scheduled → cancelled` transition:
     *   1. In a single transaction with a pessimistic_write lock on the
     *      schedule entry: re-check the status (the lock blocks a racing
     *      cancel; once the racer commits, this caller sees status=cancelled
     *      and bails out idempotently — no duplicate event), capture the
     *      affected customer ids, flip status + reason, bulk-delete pending
     *      reminders.
     *   2. AFTER commit, emit SCHEDULE_CANCELLED_EVENT so Story 5.5's
     *      listener can notify subscribers. Emit-after-commit avoids "we
     *      sent the cancellation notification, but the DB rolled back".
     *
     * The customer-id capture happens INSIDE the transaction so a new
     * subscriber arriving between read-of-customers and delete-of-reminders
     * is either included in the event (their reminder existed at read time)
     * or skipped entirely (they inserted after the read, the row stays).
     */
    async cancel(id: string, reason: string | null, audit?: IAuditContext): Promise<AdminScheduleItemDto> {
        type TCancelResult = {
            entry: ScheduleEntry;
            wasAlreadyCancelled: boolean;
            affectedCustomerIds: string[];
        };

        const result: TCancelResult = await this.dataSource.transaction(async (manager) => {
            const lockedRepo = manager.getRepository(ScheduleEntry);
            // Lock the bare row only. Requesting `relations` here would make
            // TypeORM emit `SELECT ... LEFT JOIN coaches LEFT JOIN training_types
            // ... FOR UPDATE`, which Postgres rejects with "FOR UPDATE cannot be
            // applied to the nullable side of an outer join". Relations are loaded
            // by a separate, unlocked read below (we still hold this row's lock).
            const locked = await lockedRepo.findOne({
                where: { id },
                lock: { mode: 'pessimistic_write' },
            });
            if (!locked) {
                throw new NotFoundException(`Schedule entry ${id} not found`);
            }

            const wasAlreadyCancelled = locked.status === 'cancelled';
            let affectedCustomerIds: string[] = [];
            if (!wasAlreadyCancelled) {
                affectedCustomerIds = await this.reminderService.findPendingCustomersByClass(id, manager);
                await manager.update(ScheduleEntry, { id }, { status: 'cancelled', cancellationReason: reason });
                await this.reminderService.deletePendingByClass(id, manager);
            }

            // Re-read WITH relations (no lock) for the response DTO + event
            // snapshot. Reflects the just-written status/reason on the cancel path.
            const entry = await lockedRepo.findOne({ where: { id }, relations: ['coach', 'trainingType'] });
            // Guaranteed present — we hold the pessimistic_write lock on this row.
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            return { entry: entry!, wasAlreadyCancelled, affectedCustomerIds };
        });

        if (result.wasAlreadyCancelled) {
            return toAdminScheduleItem(result.entry);
        }

        const payload: IScheduleCancelledPayload = {
            scheduleEntryId: id,
            cancellationReason: reason,
            affectedCustomerIds: result.affectedCustomerIds,
            snapshot: {
                className: result.entry.trainingType.name,
                startTime: result.entry.startTime,
                coachName: result.entry.coach.name,
            },
        };
        this.eventEmitter.emit(SCHEDULE_CANCELLED_EVENT, payload);
        this.logger.log(`Cancelled schedule entry ${id} (affected ${result.affectedCustomerIds.length} customer(s))`);
        await this.auditService.record({
            adminUserId: audit?.adminUserId ?? null,
            ipAddress: audit?.ipAddress ?? null,
            action: 'cancel_schedule_entry',
            resourceType: 'schedule_entry',
            resourceId: id,
            metadata: {
                reason,
                affectedCustomers: result.affectedCustomerIds.length,
                className: result.entry.trainingType.name,
                startTime: result.entry.startTime,
            },
        });
        return toAdminScheduleItem(result.entry);
    }

    /**
     * Story 6.4 — hard delete. The "has subscribers" block was lifted: deleting a
     * class within the 5-day notify window now broadcasts a cancellation push to
     * all linked customers (via SCHEDULE_DELETED). Bulk delete keeps the guard.
     */
    async deleteEntry(id: string, audit?: IAuditContext): Promise<void> {
        const entry = await this.scheduleRepo.findOne({
            where: { id },
            relations: ['coach', 'trainingType'],
        });
        if (!entry) {
            throw new NotFoundException(`Schedule entry ${id} not found`);
        }
        const snapshot = {
            className: entry.trainingType?.name ?? 'Занятие',
            coachName: entry.coach?.name ?? '—',
            startTime: entry.startTime,
        };
        await this.scheduleRepo.remove(entry);
        this.logger.log(`Deleted schedule entry ${id}`);

        const deletedPayload: IScheduleDeletedPayload = { scheduleEntryId: id, snapshot };
        this.eventEmitter.emit(SCHEDULE_DELETED_EVENT, deletedPayload);

        await this.auditService.record({
            adminUserId: audit?.adminUserId ?? null,
            ipAddress: audit?.ipAddress ?? null,
            action: 'delete_schedule_entry',
            resourceType: 'schedule_entry',
            resourceId: id,
            metadata: { startTime: snapshot.startTime, coachName: snapshot.coachName, className: snapshot.className },
        });
    }

    /**
     * Bulk hard-delete — built for the "calendar got duplicated, wipe these"
     * workflow. Partial success by design: each id is judged independently and
     * the ones with subscribers (any reminder) are SKIPPED rather than failing
     * the whole batch, so the admin removes every safe duplicate in one call and
     * gets back a report of what was kept and why. Same safety rule as the
     * single delete — a class anyone signed up for must be cancelled, not deleted.
     */
    async bulkDelete(ids: string[], audit?: IAuditContext): Promise<BulkDeleteResponseDto> {
        // De-dup so a repeated id can't be double-counted in the report.
        const uniqueIds = [...new Set(ids)];
        const entries = await this.scheduleRepo.find({
            where: { id: In(uniqueIds) },
            relations: ['reminders', 'coach', 'trainingType'],
        });
        const byId = new Map(entries.map((e) => [e.id, e]));

        const skipped: SkippedDeleteDto[] = [];
        const deletable: ScheduleEntry[] = [];
        for (const id of uniqueIds) {
            const entry = byId.get(id);
            if (!entry) {
                skipped.push({ id, reason: 'not_found' });
            } else if (entry.reminders.length > 0) {
                skipped.push({ id, reason: 'has_subscribers' });
            } else {
                deletable.push(entry);
            }
        }

        if (deletable.length > 0) {
            await this.scheduleRepo.remove(deletable);
            this.logger.log(`Bulk-deleted ${deletable.length} schedule entries (skipped ${skipped.length})`);
            // One audit row per removed class — keeps the trail uniform with the
            // single-delete path. Best-effort; a failed write never blocks.
            await Promise.all(
                deletable.map((entry) =>
                    this.auditService.record({
                        adminUserId: audit?.adminUserId ?? null,
                        ipAddress: audit?.ipAddress ?? null,
                        action: 'delete_schedule_entry',
                        resourceType: 'schedule_entry',
                        resourceId: entry.id,
                        metadata: {
                            startTime: entry.startTime,
                            coachName: entry.coach?.name,
                            className: entry.trainingType?.name,
                            bulk: true,
                        },
                    }),
                ),
            );
        }

        return { deleted: deletable.map((e) => e.id), skipped };
    }

    /** Assert every requested id is present in the loaded map and active. */
    private assertAllActive<T extends { isActive: boolean }>(
        ids: string[],
        byId: Map<string, T>,
        label: 'Coach' | 'TrainingType',
    ): void {
        for (const id of ids) {
            const found = byId.get(id);
            if (!found || !found.isActive) {
                throw new BadRequestException(`${label} ${id} not found or inactive`);
            }
        }
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
