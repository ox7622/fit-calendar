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
});
