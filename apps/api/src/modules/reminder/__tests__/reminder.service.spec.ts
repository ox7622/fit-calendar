import { Reminder, ScheduleEntry } from '@fitcalendar/db';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QueryFailedError, type Repository } from 'typeorm';

import { ReminderService } from '../reminder.service';

const CUSTOMER_ID = 'cust-1';
const REMINDER_MINUTES = 30;

const inFuture = (minutes: number): Date => new Date(Date.now() + minutes * 60_000);
const inPast = (minutes: number): Date => new Date(Date.now() - minutes * 60_000);

const buildScheduleEntry = (overrides: Partial<ScheduleEntry> = {}): ScheduleEntry =>
    ({
        id: 'sched-1',
        startTime: inFuture(120),
        status: 'scheduled',
        durationMinutes: 60,
        coachId: 'coach-1',
        trainingTypeId: 'tt-1',
        ...overrides,
    } as ScheduleEntry);

const buildReminder = (overrides: Partial<Reminder> = {}): Reminder =>
    ({
        id: 'rem-1',
        customerId: CUSTOMER_ID,
        scheduleEntryId: 'sched-1',
        notifyAt: inFuture(90),
        status: 'pending',
        sentAt: null,
        createdAt: new Date(),
        ...overrides,
    } as Reminder);

describe('ReminderService', () => {
    let service: ReminderService;
    let reminderRepo: jest.Mocked<Repository<Reminder>>;
    let scheduleRepo: jest.Mocked<Repository<ScheduleEntry>>;

    beforeEach(async () => {
        reminderRepo = {
            findOne: jest.fn(),
            create: jest.fn((dto) => dto as Reminder),
            save: jest.fn(),
            remove: jest.fn(),
        } as unknown as jest.Mocked<Repository<Reminder>>;
        scheduleRepo = {
            findOne: jest.fn(),
        } as unknown as jest.Mocked<Repository<ScheduleEntry>>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ReminderService,
                { provide: getRepositoryToken(Reminder), useValue: reminderRepo },
                { provide: getRepositoryToken(ScheduleEntry), useValue: scheduleRepo },
            ],
        }).compile();

        service = module.get(ReminderService);
    });

    describe('subscribe', () => {
        it('creates a reminder with notifyAt = startTime − reminderMinutes (happy path)', async () => {
            const startTime = inFuture(120);
            scheduleRepo.findOne.mockResolvedValueOnce(buildScheduleEntry({ startTime }));
            reminderRepo.findOne.mockResolvedValueOnce(null);
            reminderRepo.save.mockImplementation(async (r) => buildReminder({ ...r, id: 'rem-new' } as Reminder));

            const result = await service.subscribe(
                { customerId: CUSTOMER_ID, reminderMinutes: REMINDER_MINUTES },
                'sched-1',
            );

            expect(result.id).toBe('rem-new');
            expect(result.status).toBe('pending');
            // notifyAt should be exactly 30 minutes earlier than startTime
            const savedReminder = reminderRepo.create.mock.calls[0][0] as Partial<Reminder>;
            expect(savedReminder.notifyAt?.getTime()).toBe(startTime.getTime() - REMINDER_MINUTES * 60_000);
        });

        it('returns the existing reminder without inserting (idempotent)', async () => {
            const existing = buildReminder();
            scheduleRepo.findOne.mockResolvedValueOnce(buildScheduleEntry());
            reminderRepo.findOne.mockResolvedValueOnce(existing);

            const result = await service.subscribe(
                { customerId: CUSTOMER_ID, reminderMinutes: REMINDER_MINUTES },
                'sched-1',
            );

            expect(result.id).toBe(existing.id);
            expect(reminderRepo.save).not.toHaveBeenCalled();
        });

        it('re-fetches and returns the winner when two concurrent inserts race (23505)', async () => {
            const winner = buildReminder({ id: 'rem-winner' });
            scheduleRepo.findOne.mockResolvedValueOnce(buildScheduleEntry());
            // First findOne: pre-insert check — no existing row, so we attempt insert.
            // Second findOne: post-violation re-fetch — winner is there.
            reminderRepo.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(winner);

            const uniqueViolation = new QueryFailedError('insert', [], new Error('duplicate'));
            (uniqueViolation as QueryFailedError & { code: string }).code = '23505';
            reminderRepo.save.mockRejectedValueOnce(uniqueViolation);

            const result = await service.subscribe(
                { customerId: CUSTOMER_ID, reminderMinutes: REMINDER_MINUTES },
                'sched-1',
            );

            expect(result.id).toBe('rem-winner');
        });

        it('throws 404 when the schedule entry does not exist', async () => {
            scheduleRepo.findOne.mockResolvedValueOnce(null);

            await expect(
                service.subscribe({ customerId: CUSTOMER_ID, reminderMinutes: REMINDER_MINUTES }, 'missing'),
            ).rejects.toThrow(NotFoundException);
        });

        it('rejects 400 when the class is cancelled', async () => {
            scheduleRepo.findOne.mockResolvedValueOnce(buildScheduleEntry({ status: 'cancelled' }));

            await expect(
                service.subscribe({ customerId: CUSTOMER_ID, reminderMinutes: REMINDER_MINUTES }, 'sched-1'),
            ).rejects.toThrow(BadRequestException);
        });

        it('rejects 400 when the class has already started', async () => {
            scheduleRepo.findOne.mockResolvedValueOnce(buildScheduleEntry({ startTime: inPast(5) }));

            await expect(
                service.subscribe({ customerId: CUSTOMER_ID, reminderMinutes: REMINDER_MINUTES }, 'sched-1'),
            ).rejects.toThrow(BadRequestException);
        });
    });

    describe('unsubscribe', () => {
        it('removes the reminder when it exists and is owned by the caller', async () => {
            const reminder = buildReminder();
            reminderRepo.findOne.mockResolvedValueOnce(reminder);

            await service.unsubscribe(CUSTOMER_ID, reminder.id);

            expect(reminderRepo.findOne).toHaveBeenCalledWith({
                where: { id: reminder.id, customerId: CUSTOMER_ID },
            });
            expect(reminderRepo.remove).toHaveBeenCalledWith(reminder);
        });

        it("throws 404 when the reminder doesn't exist", async () => {
            reminderRepo.findOne.mockResolvedValueOnce(null);

            await expect(service.unsubscribe(CUSTOMER_ID, 'missing')).rejects.toThrow(NotFoundException);
        });

        it('throws 404 when the reminder belongs to a different customer (no leakage)', async () => {
            // The query gates on (id, customerId) so a foreign reminder looks identical to "missing".
            reminderRepo.findOne.mockResolvedValueOnce(null);

            await expect(service.unsubscribe(CUSTOMER_ID, 'rem-of-other-customer')).rejects.toThrow(NotFoundException);
            expect(reminderRepo.remove).not.toHaveBeenCalled();
        });
    });

    describe('findActiveByCustomer', () => {
        // The query uses createQueryBuilder. We mock the builder chain end-to-end
        // and assert that the right where-clauses and ordering land on it.
        function setupQueryBuilder(rows: Reminder[]): {
            getMany: jest.Mock;
            where: jest.Mock;
            andWhere: jest.Mock;
            orderBy: jest.Mock;
        } {
            const builder = {
                innerJoinAndSelect: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue(rows),
            } as unknown as {
                getMany: jest.Mock;
                where: jest.Mock;
                andWhere: jest.Mock;
                orderBy: jest.Mock;
            };
            (reminderRepo.createQueryBuilder as unknown as jest.Mock) = jest.fn().mockReturnValue(builder);
            return builder;
        }

        const buildReminderWithRelations = (overrides: Partial<Reminder> = {}): Reminder =>
            ({
                ...buildReminder(),
                customerId: CUSTOMER_ID,
                scheduleEntry: {
                    id: 'sched-1',
                    startTime: inFuture(60),
                    durationMinutes: 60,
                    status: 'scheduled',
                    coach: { id: 'c', name: 'Мария', photoUrl: null },
                    trainingType: { id: 't', name: 'Йога' },
                } as ScheduleEntry,
                ...overrides,
            } as Reminder);

        it('filters by customerId and excludes past classes (where clauses)', async () => {
            const builder = setupQueryBuilder([buildReminderWithRelations()]);

            const now = new Date('2026-05-15T10:00:00Z');
            await service.findActiveByCustomer(CUSTOMER_ID, now);

            expect(builder.where).toHaveBeenCalledWith('r.customerId = :customerId', { customerId: CUSTOMER_ID });
            expect(builder.andWhere).toHaveBeenCalledWith('entry.startTime > :now', { now });
        });

        it('orders by entry.startTime ASC (soonest first)', async () => {
            const builder = setupQueryBuilder([]);

            await service.findActiveByCustomer(CUSTOMER_ID);

            expect(builder.orderBy).toHaveBeenCalledWith('entry.startTime', 'ASC');
        });

        it('returns an empty array when the customer has no active reminders', async () => {
            setupQueryBuilder([]);

            const result = await service.findActiveByCustomer(CUSTOMER_ID);

            expect(result).toEqual([]);
        });

        it('maps each result to a ReminderListItemDto with nested class info', async () => {
            const reminder = buildReminderWithRelations({
                id: 'rem-x',
                scheduleEntry: {
                    id: 'sched-x',
                    startTime: new Date('2026-05-15T10:00:00Z'),
                    durationMinutes: 45,
                    status: 'scheduled',
                    coach: { id: 'c-x', name: 'Алексей', photoUrl: 'https://photo' },
                    trainingType: { id: 'tt-x', name: 'Силовая' },
                } as ScheduleEntry,
            });
            setupQueryBuilder([reminder]);

            const [item] = await service.findActiveByCustomer(CUSTOMER_ID);

            expect(item.id).toBe('rem-x');
            expect(item.scheduleEntryId).toBe('sched-1'); // from buildReminder default
            expect(item.class).toEqual({
                id: 'sched-x',
                name: 'Силовая',
                startTime: new Date('2026-05-15T10:00:00Z'),
                durationMinutes: 45,
                coachName: 'Алексей',
                coachPhotoUrl: 'https://photo',
            });
        });
    });

    describe('recomputeNotifyAtForClass (Story 6.3)', () => {
        const newStartTime = new Date('2026-05-15T12:00:00Z'); // top of the hour

        beforeEach(() => {
            // Default mock: repository find returns no reminders, update is a no-op
            (reminderRepo.update as unknown as jest.Mock) = jest.fn().mockResolvedValue(undefined);
        });

        it('updates each pending reminder using its customer-specific reminderMinutes', async () => {
            (reminderRepo.find as unknown as jest.Mock) = jest.fn().mockResolvedValueOnce([
                { id: 'r1', customer: { reminderMinutes: 15 } },
                { id: 'r2', customer: { reminderMinutes: 60 } },
            ]);

            const updated = await service.recomputeNotifyAtForClass('sched-1', newStartTime);

            expect(updated).toBe(2);
            expect(reminderRepo.update).toHaveBeenCalledWith(
                { id: 'r1' },
                { notifyAt: new Date('2026-05-15T11:45:00Z') }, // 15 min before 12:00
            );
            expect(reminderRepo.update).toHaveBeenCalledWith(
                { id: 'r2' },
                { notifyAt: new Date('2026-05-15T11:00:00Z') }, // 60 min before 12:00
            );
        });

        it('only queries reminders with status=pending (skips sent/failed)', async () => {
            const findMock = jest.fn().mockResolvedValueOnce([]);
            (reminderRepo.find as unknown as jest.Mock) = findMock;

            await service.recomputeNotifyAtForClass('sched-1', newStartTime);

            expect(findMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({ scheduleEntryId: 'sched-1', status: 'pending' }),
                }),
            );
        });

        it('returns 0 and skips updates when no pending reminders exist', async () => {
            (reminderRepo.find as unknown as jest.Mock) = jest.fn().mockResolvedValueOnce([]);

            const updated = await service.recomputeNotifyAtForClass('sched-1', newStartTime);

            expect(updated).toBe(0);
            expect(reminderRepo.update).not.toHaveBeenCalled();
        });
    });

    describe('findOneByCustomerAndEntry', () => {
        it('delegates to repo.findOne with the composite key', async () => {
            reminderRepo.findOne.mockResolvedValueOnce(buildReminder());

            await service.findOneByCustomerAndEntry(CUSTOMER_ID, 'sched-1');

            expect(reminderRepo.findOne).toHaveBeenCalledWith({
                where: { customerId: CUSTOMER_ID, scheduleEntryId: 'sched-1' },
            });
        });
    });

    describe('findDueReminders (Story 5.3 + 7.6 freeze-aware)', () => {
        // Records every andWhere call so each test can assert which filters
        // the dispatcher applied without depending on call order.
        type TQbCall = { sql: string; params?: Record<string, unknown> };
        let qbCalls: TQbCall[];
        let qbTake: number | undefined;

        beforeEach(() => {
            qbCalls = [];
            qbTake = undefined;
            const qb = {
                leftJoinAndSelect: jest.fn().mockReturnThis(),
                where: jest.fn(function (sql: string, params?: Record<string, unknown>) {
                    qbCalls.push({ sql, params });
                    return qb;
                }),
                andWhere: jest.fn(function (sql: string, params?: Record<string, unknown>) {
                    qbCalls.push({ sql, params });
                    return qb;
                }),
                orderBy: jest.fn().mockReturnThis(),
                take: jest.fn(function (n: number) {
                    qbTake = n;
                    return qb;
                }),
                getMany: jest.fn().mockResolvedValue([]),
            };
            (reminderRepo.createQueryBuilder as unknown as jest.Mock) = jest.fn().mockReturnValue(qb);
        });

        it('queries pending reminders with notifyAt <= now AND retryCount < MAX_RETRY_ATTEMPTS', async () => {
            const now = new Date('2026-04-01T10:00:00Z');
            await service.findDueReminders(now);

            // Joined relations so the dispatcher gets customer + entry + coach + trainingType.
            const qb = (reminderRepo.createQueryBuilder as unknown as jest.Mock).mock.results[0].value;
            expect(qb.leftJoinAndSelect).toHaveBeenCalledWith('r.customer', 'customer');
            expect(qb.leftJoinAndSelect).toHaveBeenCalledWith('r.scheduleEntry', 'entry');
            expect(qb.leftJoinAndSelect).toHaveBeenCalledWith('entry.coach', 'coach');
            expect(qb.leftJoinAndSelect).toHaveBeenCalledWith('entry.trainingType', 'trainingType');

            // Core filters wired with parameter binding (no SQL injection of `now`).
            expect(qbCalls.find((c) => c.sql.includes('r.status = :pending'))?.params).toEqual({ pending: 'pending' });
            expect(qbCalls.find((c) => c.sql.includes('r.notifyAt <= :now'))?.params).toEqual({ now });
            expect(qbCalls.find((c) => c.sql.includes('r.retryCount <= :maxRetry'))?.params).toEqual({ maxRetry: 2 });
        });

        it('respects the batchSize cap (default 100)', async () => {
            await service.findDueReminders(new Date(), 25);
            expect(qbTake).toBe(25);
        });

        // Story 7.6 follow-up: frozen members shouldn't get reminded for
        // classes that fall inside their freeze window. We assert the
        // generated NOT EXISTS subquery references the right columns; the
        // semantic check (a frozen member's reminder really doesn't fire)
        // belongs to an integration test against a real DB, not a unit
        // spec that mocks the query builder.
        it('excludes reminders whose class startTime falls inside an active freeze on the customer', async () => {
            await service.findDueReminders(new Date());

            const freezeClause = qbCalls.find((c) => c.sql.includes('NOT EXISTS'));
            expect(freezeClause).toBeDefined();
            expect(freezeClause?.sql).toMatch(/customer_memberships/);
            expect(freezeClause?.sql).toMatch(/freeze_events/);
            expect(freezeClause?.sql).toMatch(/m\.status = 'active'/);
            expect(freezeClause?.sql).toMatch(/entry\."startTime"::date BETWEEN/);
        });
    });

    describe('markSent', () => {
        it('updates status=sent and stamps sentAt', async () => {
            const updateMock = jest.fn().mockResolvedValueOnce({ affected: 1 });
            (reminderRepo.update as unknown as jest.Mock) = updateMock;

            await service.markSent('rem-x');

            expect(updateMock).toHaveBeenCalledWith(
                { id: 'rem-x' },
                expect.objectContaining({ status: 'sent', sentAt: expect.any(Date) }),
            );
        });
    });

    describe('recordFailure (Story 5.3)', () => {
        let updateMock: jest.Mock;
        beforeEach(() => {
            updateMock = jest.fn().mockResolvedValueOnce({ affected: 1 });
            (reminderRepo.update as unknown as jest.Mock) = updateMock;
        });

        it('increments retryCount but keeps status=pending below the cap', async () => {
            // currentRetryCount=0 → newRetryCount=1, MAX is 3 (exhausted at 3).
            const result = await service.recordFailure('rem-x', 0);

            expect(updateMock).toHaveBeenCalledWith({ id: 'rem-x' }, { retryCount: 1, status: 'pending' });
            expect(result.status).toBe('pending');
        });

        it('flips status=failed when the increment hits MAX_RETRY_ATTEMPTS', async () => {
            // currentRetryCount=2 → newRetryCount=3 → exhausted.
            const result = await service.recordFailure('rem-x', 2);

            expect(updateMock).toHaveBeenCalledWith({ id: 'rem-x' }, { retryCount: 3, status: 'failed' });
            expect(result.status).toBe('failed');
        });
    });

    describe('findPendingByClassWithCustomer (Story 5.4)', () => {
        it('joins Customer, filters pending + non-null telegramId, coerces telegramId to number', async () => {
            const qb = {
                innerJoin: jest.fn().mockReturnThis(),
                select: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                getRawMany: jest.fn().mockResolvedValueOnce([
                    { reminderId: 'r1', telegramId: '111', firstName: 'Анна' },
                    { reminderId: 'r2', telegramId: '222', firstName: 'Борис' },
                ]),
            };
            (reminderRepo.createQueryBuilder as unknown as jest.Mock) = jest.fn().mockReturnValueOnce(qb);

            const result = await service.findPendingByClassWithCustomer('sched-1');

            expect(qb.innerJoin).toHaveBeenCalledWith('r.customer', 'c');
            // First .where pins scheduleEntryId; the two .andWhere clauses pin status + telegramId-not-null.
            expect(qb.where).toHaveBeenCalledWith(
                expect.stringContaining('scheduleEntryId'),
                expect.objectContaining({ scheduleEntryId: 'sched-1' }),
            );
            expect(qb.andWhere).toHaveBeenCalledTimes(2);
            // Telegram ids are returned as strings from the driver; service must Number() them.
            expect(result[0].telegramId).toBe(111);
            expect(typeof result[0].telegramId).toBe('number');
            expect(result).toHaveLength(2);
        });
    });

    describe('findPendingCustomersByClass (Story 6.4)', () => {
        it('returns the DISTINCT customer-id list for pending reminders on the class', async () => {
            const qb = {
                select: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                getRawMany: jest.fn().mockResolvedValueOnce([{ customerId: 'cust-a' }, { customerId: 'cust-b' }]),
            };
            (reminderRepo.createQueryBuilder as unknown as jest.Mock) = jest.fn().mockReturnValueOnce(qb);

            const result = await service.findPendingCustomersByClass('sched-1');

            // DISTINCT projection — Story 6.4 needs it so a customer who somehow has two pending rows
            // (defensive — the unique index makes this impossible in practice) doesn't get notified twice.
            expect(qb.select).toHaveBeenCalledWith('DISTINCT r.customerId', 'customerId');
            expect(result).toEqual(['cust-a', 'cust-b']);
        });
    });

    describe('deletePendingByClass (Story 6.4)', () => {
        it('uses the caller-supplied EntityManager when provided (transaction participation)', async () => {
            const txRepo = {
                createQueryBuilder: jest.fn().mockReturnValue({
                    delete: jest.fn().mockReturnThis(),
                    from: jest.fn().mockReturnThis(),
                    where: jest.fn().mockReturnThis(),
                    andWhere: jest.fn().mockReturnThis(),
                    execute: jest.fn().mockResolvedValue({ affected: 3 }),
                }),
            };
            const manager = { getRepository: jest.fn().mockReturnValue(txRepo) };

            const affected = await service.deletePendingByClass('sched-1', manager as never);

            expect(manager.getRepository).toHaveBeenCalled();
            expect(affected).toBe(3);
        });

        it('falls back to the injected repo when no manager is passed', async () => {
            const qb = {
                delete: jest.fn().mockReturnThis(),
                from: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                execute: jest.fn().mockResolvedValueOnce({ affected: 5 }),
            };
            (reminderRepo.createQueryBuilder as unknown as jest.Mock) = jest.fn().mockReturnValueOnce(qb);

            const affected = await service.deletePendingByClass('sched-1');

            expect(affected).toBe(5);
        });

        it('returns 0 when the delete affected no rows (result.affected may be null)', async () => {
            const qb = {
                delete: jest.fn().mockReturnThis(),
                from: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                execute: jest.fn().mockResolvedValueOnce({ affected: null }),
            };
            (reminderRepo.createQueryBuilder as unknown as jest.Mock) = jest.fn().mockReturnValueOnce(qb);

            expect(await service.deletePendingByClass('sched-1')).toBe(0);
        });
    });
});
