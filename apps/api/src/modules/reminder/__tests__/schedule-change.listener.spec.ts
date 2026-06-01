import { ScheduleEntry } from '@fitcalendar/db';
import { ConfigService } from '@nestjs/config';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import type { IScheduleChangedPayload } from '../../admin/schedule/schedule.events';
import { ScheduleChangeNotificationListener } from '../listeners/schedule-change.listener';
import { NotificationOutboxService } from '../notification-outbox.service';
import { ReminderService } from '../reminder.service';

const baseEntry = (overrides: Partial<ScheduleEntry> = {}): ScheduleEntry =>
    ({
        id: 'sched-1',
        status: 'scheduled',
        startTime: new Date('2026-06-01T10:00:00Z'),
        durationMinutes: 60,
        coach: { id: 'c1', name: 'Мария' },
        trainingType: { id: 't1', name: 'Йога' },
        ...overrides,
    } as ScheduleEntry);

const basePayload = (overrides: Partial<IScheduleChangedPayload> = {}): IScheduleChangedPayload => ({
    scheduleEntryId: 'sched-1',
    oldStartTime: new Date('2026-06-01T10:00:00Z'),
    newStartTime: new Date('2026-06-01T11:00:00Z'),
    oldDurationMinutes: 60,
    newDurationMinutes: 60,
    ...overrides,
});

describe('ScheduleChangeNotificationListener', () => {
    let listener: ScheduleChangeNotificationListener;
    let scheduleRepo: { findOne: jest.Mock };
    let reminderService: jest.Mocked<Pick<ReminderService, 'findPendingByClassWithCustomer'>>;
    let outboxService: jest.Mocked<Pick<NotificationOutboxService, 'enqueue'>>;
    let configService: { get: jest.Mock };

    beforeEach(async () => {
        scheduleRepo = { findOne: jest.fn() };
        reminderService = { findPendingByClassWithCustomer: jest.fn().mockResolvedValue([]) };
        outboxService = { enqueue: jest.fn().mockResolvedValue(undefined) };
        configService = { get: jest.fn().mockReturnValue('https://app.example.com') };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ScheduleChangeNotificationListener,
                { provide: getRepositoryToken(ScheduleEntry), useValue: scheduleRepo },
                { provide: ReminderService, useValue: reminderService },
                { provide: NotificationOutboxService, useValue: outboxService },
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();

        listener = module.get(ScheduleChangeNotificationListener);
    });

    it('enqueues one outbox row per subscriber with old + new time, class name, and coach', async () => {
        scheduleRepo.findOne.mockResolvedValueOnce(baseEntry());
        reminderService.findPendingByClassWithCustomer.mockResolvedValueOnce([
            { reminderId: 'r1', customerId: 'cust-1', telegramId: 111, firstName: 'Анна' },
            { reminderId: 'r2', customerId: 'cust-2', telegramId: 222, firstName: 'Борис' },
        ]);

        await listener.handleScheduleChanged(basePayload());

        expect(outboxService.enqueue).toHaveBeenCalledTimes(2);
        const first = outboxService.enqueue.mock.calls[0][0];
        expect(first).toMatchObject({ customerId: 'cust-1', type: 'schedule_changed' });
        expect(first.payload.telegramId).toBe(111);
        expect(first.payload.text).toContain('Изменение в расписании');
        expect(first.payload.text).toContain('Йога');
        expect(first.payload.text).toContain('Мария');
        expect(first.payload.text).toContain('Было:');
        expect(first.payload.text).toContain('Будет:');
    });

    it('enqueues a deep-link webAppUrl to /schedule/:id', async () => {
        scheduleRepo.findOne.mockResolvedValueOnce(baseEntry());
        reminderService.findPendingByClassWithCustomer.mockResolvedValueOnce([
            { reminderId: 'r1', customerId: 'cust-1', telegramId: 111, firstName: 'Анна' },
        ]);

        await listener.handleScheduleChanged(basePayload());

        const input = outboxService.enqueue.mock.calls[0][0];
        expect(input.payload.webAppUrl).toBe('https://app.example.com/schedule/sched-1');
        expect(input.payload.scheduleEntryId).toBe('sched-1');
    });

    it('is a no-op when nobody is subscribed', async () => {
        scheduleRepo.findOne.mockResolvedValueOnce(baseEntry());
        reminderService.findPendingByClassWithCustomer.mockResolvedValueOnce([]);

        await listener.handleScheduleChanged(basePayload());

        expect(outboxService.enqueue).not.toHaveBeenCalled();
    });

    it('bails out silently when the class has vanished (deleted between emit and handle)', async () => {
        scheduleRepo.findOne.mockResolvedValueOnce(null);

        await listener.handleScheduleChanged(basePayload());

        expect(reminderService.findPendingByClassWithCustomer).not.toHaveBeenCalled();
        expect(outboxService.enqueue).not.toHaveBeenCalled();
    });

    it('bails out when the class was cancelled after the edit (5.5 takes over)', async () => {
        scheduleRepo.findOne.mockResolvedValueOnce(baseEntry({ status: 'cancelled' }));

        await listener.handleScheduleChanged(basePayload());

        expect(reminderService.findPendingByClassWithCustomer).not.toHaveBeenCalled();
        expect(outboxService.enqueue).not.toHaveBeenCalled();
    });

    it('logs and swallows enqueue failures (does not throw to the event bus)', async () => {
        scheduleRepo.findOne.mockResolvedValueOnce(baseEntry());
        reminderService.findPendingByClassWithCustomer.mockResolvedValueOnce([
            { reminderId: 'r1', customerId: 'cust-1', telegramId: 111, firstName: 'Анна' },
        ]);
        outboxService.enqueue.mockRejectedValueOnce(new Error('db down'));

        await expect(listener.handleScheduleChanged(basePayload())).resolves.toBeUndefined();
        expect(outboxService.enqueue).toHaveBeenCalledTimes(1);
    });
});
