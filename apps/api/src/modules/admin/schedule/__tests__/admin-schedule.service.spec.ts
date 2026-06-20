import { Coach, ScheduleEntry, TrainingType } from '@fitcalendar/db';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import type { DataSource } from 'typeorm';

import { ReminderService } from '../../../reminder/reminder.service';
import { AdminAuditService } from '../../audit';
import { AdminScheduleService } from '../admin-schedule.service';
import {
    SCHEDULE_CANCELLED_EVENT,
    SCHEDULE_CHANGED_EVENT,
    SCHEDULE_CREATED_EVENT,
    SCHEDULE_DELETED_EVENT,
} from '../schedule.events';

const mockAuditService = { record: jest.fn().mockResolvedValue(undefined) };

type TQueryBuilderMock = {
    innerJoinAndSelect: jest.Mock;
    where: jest.Mock;
    andWhere: jest.Mock;
    orderBy: jest.Mock;
    skip: jest.Mock;
    take: jest.Mock;
    getManyAndCount: jest.Mock;
    _calls: { andWhere: Array<{ sql: string; params: Record<string, unknown> }>; skip: number; take: number };
};

function buildQueryBuilder(rows: ScheduleEntry[], total: number): TQueryBuilderMock {
    const _calls: TQueryBuilderMock['_calls'] = { andWhere: [], skip: 0, take: 0 };
    const qb = {
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn(function (this: TQueryBuilderMock, sql: string, params: Record<string, unknown>) {
            _calls.andWhere.push({ sql, params });
            return this;
        }),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn(function (this: TQueryBuilderMock, n: number) {
            _calls.skip = n;
            return this;
        }),
        take: jest.fn(function (this: TQueryBuilderMock, n: number) {
            _calls.take = n;
            return this;
        }),
        getManyAndCount: jest.fn().mockResolvedValue([rows, total]),
        _calls,
    } as unknown as TQueryBuilderMock;
    return qb;
}

const buildEntry = (overrides: Partial<ScheduleEntry> = {}): ScheduleEntry =>
    ({
        id: 'sched-1',
        startTime: new Date('2026-05-04T10:00:00Z'),
        durationMinutes: 60,
        status: 'scheduled',
        cancellationReason: null,
        coach: { id: 'c1', name: 'Мария', photoUrl: null },
        trainingType: { id: 't1', name: 'Йога', difficulty: 'beginner' },
        ...overrides,
    } as ScheduleEntry);

describe('AdminScheduleService', () => {
    let service: AdminScheduleService;
    let scheduleRepo: jest.Mocked<{
        createQueryBuilder: jest.Mock;
        findOne: jest.Mock;
        find: jest.Mock;
        create: jest.Mock;
        save: jest.Mock;
        remove: jest.Mock;
    }>;
    let coachRepo: jest.Mocked<{ findOne: jest.Mock; find: jest.Mock }>;
    let trainingTypeRepo: jest.Mocked<{ findOne: jest.Mock; find: jest.Mock }>;
    let eventEmitter: jest.Mocked<EventEmitter2>;
    let reminderService: jest.Mocked<
        Pick<ReminderService, 'recomputeNotifyAtForClass' | 'findPendingCustomersByClass' | 'deletePendingByClass'>
    >;
    let txManagerUpdate: jest.Mock;
    let txScheduleRepo: { findOne: jest.Mock };
    let dataSource: { transaction: jest.Mock };

    beforeEach(async () => {
        mockAuditService.record.mockClear();
        scheduleRepo = {
            createQueryBuilder: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn((dto) => dto as ScheduleEntry),
            save: jest.fn(async (entity) => entity as ScheduleEntry),
            remove: jest.fn(async (entity) => entity as ScheduleEntry),
        };
        coachRepo = { findOne: jest.fn(), find: jest.fn() };
        trainingTypeRepo = { findOne: jest.fn(), find: jest.fn() };
        eventEmitter = { emit: jest.fn() } as unknown as jest.Mocked<EventEmitter2>;
        reminderService = {
            recomputeNotifyAtForClass: jest.fn().mockResolvedValue(0),
            findPendingCustomersByClass: jest.fn().mockResolvedValue([]),
            deletePendingByClass: jest.fn().mockResolvedValue(0),
        };

        txManagerUpdate = jest.fn().mockResolvedValue({ affected: 1 });
        txScheduleRepo = { findOne: jest.fn() };
        const manager = {
            update: txManagerUpdate,
            getRepository: (target: unknown): unknown => {
                if (target === ScheduleEntry) return txScheduleRepo;
                throw new Error(`Unexpected target ${String(target)}`);
            },
        };
        dataSource = {
            transaction: jest.fn(async (cb: (m: unknown) => Promise<unknown>) => cb(manager)),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AdminScheduleService,
                { provide: getRepositoryToken(ScheduleEntry), useValue: scheduleRepo },
                { provide: getRepositoryToken(Coach), useValue: coachRepo },
                { provide: getRepositoryToken(TrainingType), useValue: trainingTypeRepo },
                { provide: getDataSourceToken(), useValue: dataSource as unknown as DataSource },
                { provide: EventEmitter2, useValue: eventEmitter },
                { provide: ReminderService, useValue: reminderService },
                { provide: AdminAuditService, useValue: mockAuditService },
            ],
        }).compile();

        service = module.get(AdminScheduleService);
    });

    it('returns paginated list with default pagination when no params given', async () => {
        const qb = buildQueryBuilder([buildEntry()], 1);
        scheduleRepo.createQueryBuilder.mockReturnValueOnce(qb);

        const result = await service.findAll({});

        expect(result.items).toHaveLength(1);
        expect(result.total).toBe(1);
        expect(result.page).toBe(1);
        expect(result.pageSize).toBe(50);
        expect(qb._calls.skip).toBe(0);
        expect(qb._calls.take).toBe(50);
    });

    it('applies coachId filter when provided', async () => {
        const qb = buildQueryBuilder([], 0);
        scheduleRepo.createQueryBuilder.mockReturnValueOnce(qb);

        await service.findAll({ coachId: 'coach-uuid' });

        const coachFilter = qb._calls.andWhere.find((c) => c.sql.includes('coachId'));
        expect(coachFilter).toBeDefined();
        expect(coachFilter?.params).toEqual({ coachId: 'coach-uuid' });
    });

    it('applies status filter when status is "cancelled" but skips it for "all"', async () => {
        const qbCancelled = buildQueryBuilder([], 0);
        scheduleRepo.createQueryBuilder.mockReturnValueOnce(qbCancelled);
        await service.findAll({ status: 'cancelled' });
        expect(qbCancelled._calls.andWhere.some((c) => c.sql.includes('status'))).toBe(true);

        const qbAll = buildQueryBuilder([], 0);
        scheduleRepo.createQueryBuilder.mockReturnValueOnce(qbAll);
        await service.findAll({ status: 'all' });
        expect(qbAll._calls.andWhere.some((c) => c.sql.includes('status'))).toBe(false);
    });

    it('caps pageSize at 200 even if a larger value is requested', async () => {
        const qb = buildQueryBuilder([], 0);
        scheduleRepo.createQueryBuilder.mockReturnValueOnce(qb);

        await service.findAll({ pageSize: 9999 });

        expect(qb._calls.take).toBe(200);
    });

    it('returns the unfiltered `total` from getManyAndCount (used for pagination UI)', async () => {
        const items = [buildEntry({ id: '1' }), buildEntry({ id: '2' })];
        const qb = buildQueryBuilder(items, 42);
        scheduleRepo.createQueryBuilder.mockReturnValueOnce(qb);

        const result = await service.findAll({ page: 1, pageSize: 2 });

        expect(result.items).toHaveLength(2);
        expect(result.total).toBe(42);
    });

    it('defaults range to start-of-week → +14 days when from/to omitted', async () => {
        const qb = buildQueryBuilder([], 0);
        scheduleRepo.createQueryBuilder.mockReturnValueOnce(qb);

        await service.findAll({});

        const rangeCall = (qb.where as jest.Mock).mock.calls[0];
        expect(rangeCall[0]).toContain('startTime BETWEEN');
        expect(rangeCall[1].from).toBeInstanceOf(Date);
        expect(rangeCall[1].to).toBeInstanceOf(Date);
        const fromTime = (rangeCall[1].from as Date).getTime();
        const toTime = (rangeCall[1].to as Date).getTime();
        // 14 days = 14 * 86400000 ms
        expect(toTime - fromTime).toBe(14 * 86_400_000);
    });

    describe('create (Story 6.3)', () => {
        const createDto = {
            trainingTypeId: 't-1',
            coachId: 'c-1',
            startTime: new Date('2026-05-15T10:00:00Z'),
            durationMinutes: 60,
        };

        it('persists a new entry when coach + trainingType are both active', async () => {
            coachRepo.findOne.mockResolvedValueOnce({ id: 'c-1', isActive: true } as Coach);
            trainingTypeRepo.findOne.mockResolvedValueOnce({ id: 't-1', isActive: true } as TrainingType);
            scheduleRepo.save.mockResolvedValueOnce({
                ...createDto,
                id: 'sched-new',
                status: 'scheduled',
            } as ScheduleEntry);
            scheduleRepo.findOne.mockResolvedValueOnce(buildEntry({ id: 'sched-new' }));

            const result = await service.create(createDto);

            expect(scheduleRepo.save).toHaveBeenCalled();
            expect(result.id).toBe('sched-new');
        });

        it('emits SCHEDULE_CREATED with a snapshot', async () => {
            coachRepo.findOne.mockResolvedValueOnce({ id: 'c-1', isActive: true } as Coach);
            trainingTypeRepo.findOne.mockResolvedValueOnce({ id: 't-1', isActive: true } as TrainingType);
            scheduleRepo.save.mockResolvedValueOnce({
                ...createDto,
                id: 'sched-new',
                status: 'scheduled',
            } as ScheduleEntry);
            scheduleRepo.findOne.mockResolvedValueOnce(buildEntry({ id: 'sched-new' }));

            await service.create(createDto);

            expect(eventEmitter.emit).toHaveBeenCalledWith(
                SCHEDULE_CREATED_EVENT,
                expect.objectContaining({
                    scheduleEntryId: 'sched-new',
                    snapshot: expect.objectContaining({
                        className: expect.any(String),
                        coachName: expect.any(String),
                    }),
                }),
            );
        });

        it('rejects 400 when coach is inactive', async () => {
            coachRepo.findOne.mockResolvedValueOnce({ id: 'c-1', isActive: false } as Coach);

            await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
            expect(scheduleRepo.save).not.toHaveBeenCalled();
        });

        it('rejects 400 when trainingType does not exist', async () => {
            coachRepo.findOne.mockResolvedValueOnce({ id: 'c-1', isActive: true } as Coach);
            trainingTypeRepo.findOne.mockResolvedValueOnce(null);

            await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
            expect(scheduleRepo.save).not.toHaveBeenCalled();
        });

        it('does NOT emit SCHEDULE_CREATED when notify=false', async () => {
            coachRepo.findOne.mockResolvedValueOnce({ id: 'c-1', isActive: true } as Coach);
            trainingTypeRepo.findOne.mockResolvedValueOnce({ id: 't-1', isActive: true } as TrainingType);
            scheduleRepo.save.mockResolvedValueOnce({
                ...createDto,
                id: 'sched-new',
                status: 'scheduled',
            } as ScheduleEntry);
            scheduleRepo.findOne.mockResolvedValueOnce(buildEntry({ id: 'sched-new' }));

            await service.create(createDto, false);

            expect(eventEmitter.emit).not.toHaveBeenCalledWith(SCHEDULE_CREATED_EVENT, expect.anything());
        });
    });

    describe('update (Story 6.3)', () => {
        const existing = buildEntry({
            id: 'sched-edit',
            startTime: new Date('2026-05-15T10:00:00Z'),
            durationMinutes: 60,
            coachId: 'c-1',
            trainingTypeId: 't-1',
        });

        beforeEach(() => {
            // Clone on each findOne so the service's in-place mutation of `startTime`
            // doesn't leak across the load → save → reload cycle in the test.
            scheduleRepo.findOne.mockImplementation(async () => ({ ...existing } as ScheduleEntry));
            scheduleRepo.save.mockImplementation(async (e) => e as ScheduleEntry);
        });

        it('throws 404 when the entry does not exist', async () => {
            scheduleRepo.findOne.mockResolvedValueOnce(null);

            await expect(service.update('missing', { durationMinutes: 90 })).rejects.toThrow(NotFoundException);
        });

        it('does NOT emit the event or recompute reminders when nothing time-related changed', async () => {
            await service.update('sched-edit', { durationMinutes: 60, startTime: existing.startTime });

            expect(eventEmitter.emit).not.toHaveBeenCalled();
            expect(reminderService.recomputeNotifyAtForClass).not.toHaveBeenCalled();
        });

        it('emits SCHEDULE_CHANGED_EVENT + recomputes reminders when startTime changes', async () => {
            const newStartTime = new Date('2026-05-15T11:00:00Z');

            await service.update('sched-edit', { startTime: newStartTime });

            expect(reminderService.recomputeNotifyAtForClass).toHaveBeenCalledWith('sched-edit', newStartTime);
            expect(eventEmitter.emit).toHaveBeenCalledWith(
                SCHEDULE_CHANGED_EVENT,
                expect.objectContaining({
                    scheduleEntryId: 'sched-edit',
                    oldStartTime: existing.startTime,
                    newStartTime,
                    oldDurationMinutes: 60,
                    newDurationMinutes: 60,
                }),
            );
        });

        it('emits the event when only durationMinutes changes (no reminder recompute)', async () => {
            await service.update('sched-edit', { durationMinutes: 90 });

            expect(reminderService.recomputeNotifyAtForClass).not.toHaveBeenCalled();
            expect(eventEmitter.emit).toHaveBeenCalledWith(
                SCHEDULE_CHANGED_EVENT,
                expect.objectContaining({
                    oldDurationMinutes: 60,
                    newDurationMinutes: 90,
                }),
            );
        });

        it('does NOT emit SCHEDULE_CHANGED when notify=false (reminders still recompute)', async () => {
            const newStartTime = new Date('2026-05-15T11:00:00Z');
            await service.update('sched-edit', { startTime: newStartTime }, false);

            expect(reminderService.recomputeNotifyAtForClass).toHaveBeenCalledWith('sched-edit', newStartTime);
            expect(eventEmitter.emit).not.toHaveBeenCalledWith(SCHEDULE_CHANGED_EVENT, expect.anything());
        });

        it('does not crash if reminder recomputation throws — logs and continues', async () => {
            reminderService.recomputeNotifyAtForClass.mockRejectedValueOnce(new Error('db hiccup'));

            await expect(
                service.update('sched-edit', { startTime: new Date('2026-05-16T10:00:00Z') }),
            ).resolves.toBeDefined();

            // Event still fires even if reminder recompute failed — the underlying class change committed.
            expect(eventEmitter.emit).toHaveBeenCalled();
        });
    });

    describe('findById (Story 6.3)', () => {
        it('returns the schedule item when it exists', async () => {
            scheduleRepo.findOne.mockResolvedValueOnce(buildEntry({ id: 'sched-1' }));

            const result = await service.findById('sched-1');

            expect(result.id).toBe('sched-1');
        });

        it('throws 404 when not found', async () => {
            scheduleRepo.findOne.mockResolvedValueOnce(null);

            await expect(service.findById('missing')).rejects.toThrow(NotFoundException);
        });
    });

    describe('cancel (Story 6.4)', () => {
        it('flips status, persists reason, deletes pending reminders, emits the event, takes a row lock', async () => {
            const entry = buildEntry({ id: 'sched-cancel', status: 'scheduled' });
            // Two reads inside the txn now: the locked bare row, then an
            // unlocked re-read WITH relations for the response/snapshot.
            txScheduleRepo.findOne.mockResolvedValue(entry);
            reminderService.findPendingCustomersByClass.mockResolvedValueOnce(['cust-a', 'cust-b']);

            const result = await service.cancel('sched-cancel', 'Coach sick');

            // The status check happens INSIDE the transaction under a row lock
            // (post-QA fix — two concurrent cancels can't both emit the event).
            expect(txScheduleRepo.findOne).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: 'sched-cancel' },
                    lock: { mode: 'pessimistic_write' },
                }),
            );

            // Regression guard: the LOCKED read must NOT request relations.
            // `FOR UPDATE` + the LEFT JOINs TypeORM emits for relations makes
            // Postgres throw "FOR UPDATE cannot be applied to the nullable side
            // of an outer join" (the production 500). Relations come from a
            // separate unlocked read.
            const lockCallArgs = txScheduleRepo.findOne.mock.calls[0][0];
            expect(lockCallArgs.lock).toEqual({ mode: 'pessimistic_write' });
            expect(lockCallArgs.relations).toBeUndefined();

            // findPendingCustomersByClass now runs inside the transaction with
            // the manager, so a new subscriber sneaking in between read +
            // delete can't be silently dropped from the event payload.
            expect(reminderService.findPendingCustomersByClass).toHaveBeenCalledWith('sched-cancel', expect.anything());
            expect(reminderService.deletePendingByClass).toHaveBeenCalledWith('sched-cancel', expect.anything());

            // Schedule update happens inside the transaction.
            expect(txManagerUpdate).toHaveBeenCalledWith(
                ScheduleEntry,
                { id: 'sched-cancel' },
                { status: 'cancelled', cancellationReason: 'Coach sick' },
            );

            // Event fires AFTER the transaction commits (transaction call returned).
            const txOrder = dataSource.transaction.mock.invocationCallOrder[0];
            const emitOrder = eventEmitter.emit.mock.invocationCallOrder[0];
            expect(emitOrder).toBeGreaterThan(txOrder);

            expect(eventEmitter.emit).toHaveBeenCalledWith(SCHEDULE_CANCELLED_EVENT, {
                scheduleEntryId: 'sched-cancel',
                cancellationReason: 'Coach sick',
                affectedCustomerIds: ['cust-a', 'cust-b'],
                snapshot: {
                    className: entry.trainingType.name,
                    startTime: entry.startTime,
                    coachName: entry.coach.name,
                },
            });
            expect(result.id).toBe('sched-cancel');
        });

        it('accepts a null reason and surfaces it in the event payload', async () => {
            const entry = buildEntry({ id: 'sched-null-reason', status: 'scheduled' });
            txScheduleRepo.findOne.mockResolvedValue(entry);

            await service.cancel('sched-null-reason', null);

            expect(txManagerUpdate).toHaveBeenCalledWith(
                ScheduleEntry,
                { id: 'sched-null-reason' },
                { status: 'cancelled', cancellationReason: null },
            );
            expect(eventEmitter.emit).toHaveBeenCalledWith(
                SCHEDULE_CANCELLED_EVENT,
                expect.objectContaining({ cancellationReason: null }),
            );
        });

        it('is idempotent: re-cancelling already-cancelled class returns the record with no side-effects', async () => {
            // The lock-and-recheck pattern means the txn DOES open, but exits
            // early once the (locked) status reads as cancelled. No update,
            // no event, no reminder churn.
            const entry = buildEntry({ id: 'sched-already', status: 'cancelled', cancellationReason: 'Old reason' });
            txScheduleRepo.findOne.mockResolvedValue(entry);

            const result = await service.cancel('sched-already', 'New reason');

            expect(result.id).toBe('sched-already');
            expect(txManagerUpdate).not.toHaveBeenCalled();
            expect(reminderService.findPendingCustomersByClass).not.toHaveBeenCalled();
            expect(reminderService.deletePendingByClass).not.toHaveBeenCalled();
            expect(eventEmitter.emit).not.toHaveBeenCalled();
        });

        it('throws 404 when the entry does not exist (no event emitted)', async () => {
            txScheduleRepo.findOne.mockResolvedValueOnce(null);

            await expect(service.cancel('missing', 'reason')).rejects.toThrow(NotFoundException);
            expect(eventEmitter.emit).not.toHaveBeenCalled();
        });

        it('does NOT emit the event if the transaction throws (pre-emit failure)', async () => {
            dataSource.transaction.mockRejectedValueOnce(new Error('db unavailable'));

            await expect(service.cancel('sched-tx-fail', 'reason')).rejects.toThrow('db unavailable');
            expect(eventEmitter.emit).not.toHaveBeenCalled();
        });

        it('does NOT emit SCHEDULE_CANCELLED when notify=false', async () => {
            const entry = buildEntry({ id: 'sched-cancel', status: 'scheduled' });
            txScheduleRepo.findOne.mockResolvedValue(entry);
            reminderService.findPendingCustomersByClass.mockResolvedValueOnce(['cust-a', 'cust-b']);

            await service.cancel('sched-cancel', 'reason', undefined, false);
            expect(eventEmitter.emit).not.toHaveBeenCalledWith(SCHEDULE_CANCELLED_EVENT, expect.anything());
        });
    });

    describe('deleteEntry (Story 6.4)', () => {
        it('removes the entry when class is in the past and has no reminders', async () => {
            const entry = buildEntry({
                id: 'sched-old',
                startTime: new Date('2020-01-01T10:00:00Z'),
                reminders: [],
            } as Partial<ScheduleEntry>);
            scheduleRepo.findOne.mockResolvedValueOnce(entry);

            await service.deleteEntry('sched-old');

            expect(scheduleRepo.remove).toHaveBeenCalledWith(entry);
            expect(eventEmitter.emit).toHaveBeenCalledWith(SCHEDULE_DELETED_EVENT, expect.anything());
        });

        it('throws 404 when the entry does not exist', async () => {
            scheduleRepo.findOne.mockResolvedValueOnce(null);

            await expect(service.deleteEntry('missing')).rejects.toThrow(NotFoundException);
            expect(scheduleRepo.remove).not.toHaveBeenCalled();
        });

        it('removes a FUTURE class with no reminders (duplicated-calendar cleanup)', async () => {
            const future = new Date(Date.now() + 7 * 86_400_000);
            const entry = buildEntry({
                id: 'sched-future',
                startTime: future,
                reminders: [],
            } as Partial<ScheduleEntry>);
            scheduleRepo.findOne.mockResolvedValueOnce(entry);

            await service.deleteEntry('sched-future');

            expect(scheduleRepo.remove).toHaveBeenCalledWith(entry);
            expect(eventEmitter.emit).toHaveBeenCalledWith(SCHEDULE_DELETED_EVENT, expect.anything());
        });

        it('deletes a class that has reminders and emits SCHEDULE_DELETED (block lifted)', async () => {
            const entry = buildEntry({
                id: 'sched-with-subs',
                reminders: [{ id: 'rem-1' }],
            } as Partial<ScheduleEntry>);
            scheduleRepo.findOne.mockResolvedValueOnce(entry);
            scheduleRepo.remove.mockResolvedValueOnce(entry);

            await expect(service.deleteEntry('sched-with-subs')).resolves.toBeUndefined();

            expect(scheduleRepo.remove).toHaveBeenCalledWith(entry);
            expect(eventEmitter.emit).toHaveBeenCalledWith(
                SCHEDULE_DELETED_EVENT,
                expect.objectContaining({ scheduleEntryId: 'sched-with-subs' }),
            );
        });

        it('does NOT emit SCHEDULE_DELETED when notify=false', async () => {
            const entry = buildEntry({ id: 'sched-x', reminders: [] } as Partial<ScheduleEntry>);
            scheduleRepo.findOne.mockResolvedValueOnce(entry);
            scheduleRepo.remove.mockResolvedValueOnce(entry);

            await service.deleteEntry('sched-x', undefined, false);

            expect(scheduleRepo.remove).toHaveBeenCalledWith(entry);
            expect(eventEmitter.emit).not.toHaveBeenCalledWith(SCHEDULE_DELETED_EVENT, expect.anything());
        });
    });

    describe('bulkDelete', () => {
        it('deletes entries with no reminders and skips ones with subscribers + missing ids', async () => {
            const ok1 = buildEntry({ id: 'ok-1', reminders: [] } as Partial<ScheduleEntry>);
            const ok2 = buildEntry({ id: 'ok-2', reminders: [] } as Partial<ScheduleEntry>);
            const withSubs = buildEntry({ id: 'subs', reminders: [{ id: 'r' }] } as Partial<ScheduleEntry>);
            // 'gone' is requested but find() doesn't return it.
            scheduleRepo.find.mockResolvedValueOnce([ok1, withSubs, ok2]);

            const result = await service.bulkDelete(['ok-1', 'subs', 'ok-2', 'gone']);

            expect(scheduleRepo.remove).toHaveBeenCalledWith([ok1, ok2]);
            expect(result.deleted).toEqual(['ok-1', 'ok-2']);
            expect(result.skipped).toEqual([
                { id: 'subs', reason: 'has_subscribers' },
                { id: 'gone', reason: 'not_found' },
            ]);
        });

        it('de-duplicates repeated ids so the report counts each once', async () => {
            const ok1 = buildEntry({ id: 'ok-1', reminders: [] } as Partial<ScheduleEntry>);
            scheduleRepo.find.mockResolvedValueOnce([ok1]);

            const result = await service.bulkDelete(['ok-1', 'ok-1']);

            expect(result.deleted).toEqual(['ok-1']);
            expect(result.skipped).toEqual([]);
        });

        it('does not call remove when nothing is deletable', async () => {
            const withSubs = buildEntry({ id: 'subs', reminders: [{ id: 'r' }] } as Partial<ScheduleEntry>);
            scheduleRepo.find.mockResolvedValueOnce([withSubs]);

            const result = await service.bulkDelete(['subs']);

            expect(scheduleRepo.remove).not.toHaveBeenCalled();
            expect(result.deleted).toEqual([]);
            expect(result.skipped).toEqual([{ id: 'subs', reason: 'has_subscribers' }]);
        });
    });

    describe('bulkCreate', () => {
        const activeCoach = { id: 'c1', isActive: true, name: 'Мария', photoUrl: null };
        const activeType = { id: 't1', isActive: true, name: 'Йога', difficulty: 'beginner' };
        const entry = {
            coachId: 'c1',
            trainingTypeId: 't1',
            startTime: new Date('2026-05-04T10:00:00Z'),
            durationMinutes: 60,
        };

        beforeEach(() => {
            coachRepo.find.mockResolvedValue([activeCoach]);
            trainingTypeRepo.find.mockResolvedValue([activeType]);
            // manager.save echoes back the rows it was given, assigning ids.
            dataSource.transaction.mockImplementation(async (cb: (m: unknown) => Promise<unknown>) =>
                cb({
                    save: jest.fn(async (_entity: unknown, rows: ScheduleEntry[]) =>
                        rows.map((r, i) => ({ ...r, id: `s${i + 1}` })),
                    ),
                }),
            );
        });

        it('validates each entity in one query and maps every saved row to a response item', async () => {
            const result = await service.bulkCreate({
                entries: [entry, { ...entry, startTime: new Date('2026-05-06T10:00:00Z') }],
            });

            expect(result.created).toBe(2);
            expect(result.items).toHaveLength(2);
            expect(result.items[0].coach.name).toBe('Мария');
            expect(result.items[0].trainingType.name).toBe('Йога');
            // One query per entity (batched via In), not one per id.
            expect(coachRepo.find).toHaveBeenCalledTimes(1);
            expect(trainingTypeRepo.find).toHaveBeenCalledTimes(1);
            // No post-save reload of the rows we just inserted.
            expect(scheduleRepo.find).not.toHaveBeenCalled();
        });

        it('rejects an inactive coach without inserting anything', async () => {
            coachRepo.find.mockResolvedValue([{ id: 'c1', isActive: false }]);
            const managerSave = jest.fn();
            dataSource.transaction.mockImplementation(async (cb: (m: unknown) => Promise<unknown>) =>
                cb({ save: managerSave }),
            );

            await expect(service.bulkCreate({ entries: [entry] })).rejects.toBeInstanceOf(BadRequestException);
            expect(managerSave).not.toHaveBeenCalled();
        });

        it('rejects when a referenced coach does not exist', async () => {
            coachRepo.find.mockResolvedValue([]); // requested c1 not returned

            await expect(service.bulkCreate({ entries: [entry] })).rejects.toBeInstanceOf(BadRequestException);
        });
    });
});
