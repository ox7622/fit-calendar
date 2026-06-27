import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';

import type {
    IScheduleCancelledPayload,
    IScheduleChangedPayload,
    IScheduleCreatedPayload,
    IScheduleDeletedPayload,
    IScheduleSnapshot,
} from '../../admin/schedule/schedule.events';
import { BotSubscriberService } from '../../bot-subscriber/bot-subscriber.service';
import { ClubService } from '../../club/club.service';
import { ScheduleNotificationListener } from '../listeners/schedule-notification.listener';
import { NotificationOutboxService } from '../notification-outbox.service';

// Fixed clock so the 5-day gate is deterministic.
const NOW = new Date('2026-06-15T12:00:00Z');
const inWindow = new Date('2026-06-16T10:00:00Z'); // +1 day
const outWindow = new Date('2026-06-30T10:00:00Z'); // +15 days

const snapshot = (startTime: Date): IScheduleSnapshot => ({ className: 'Йога', coachName: 'Мария', startTime });

describe('ScheduleNotificationListener', () => {
    let listener: ScheduleNotificationListener;
    let botSubscriberService: { findActiveRecipients: jest.Mock };
    let outboxService: { enqueue: jest.Mock };

    beforeEach(async () => {
        jest.useFakeTimers().setSystemTime(NOW);
        botSubscriberService = {
            findActiveRecipients: jest.fn().mockResolvedValue([{ telegramId: 111 }, { telegramId: 222 }]),
        };
        outboxService = { enqueue: jest.fn().mockResolvedValue(undefined) };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ScheduleNotificationListener,
                { provide: BotSubscriberService, useValue: botSubscriberService },
                { provide: NotificationOutboxService, useValue: outboxService },
                { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('https://app.example.com') } },
                { provide: ClubService, useValue: { getTimeZone: async () => 'Europe/Moscow' } },
            ],
        }).compile();

        listener = module.get(ScheduleNotificationListener);
    });

    afterEach(() => jest.useRealTimers());

    it('created: enqueues one row per recipient when in window', async () => {
        const payload: IScheduleCreatedPayload = { scheduleEntryId: 's1', snapshot: snapshot(inWindow) };
        await listener.handleCreated(payload);
        expect(outboxService.enqueue).toHaveBeenCalledTimes(2);
        const first = outboxService.enqueue.mock.calls[0][0];
        expect(first).toMatchObject({ customerId: null, type: 'schedule_created' });
        expect(first.payload.telegramId).toBe(111);
        expect(first.payload.text).toContain('Новое занятие');
        expect(first.payload.webAppUrl).toBe('https://app.example.com/schedule/s1');
    });

    it('created: no-op when out of window', async () => {
        await listener.handleCreated({ scheduleEntryId: 's1', snapshot: snapshot(outWindow) });
        expect(botSubscriberService.findActiveRecipients).not.toHaveBeenCalled();
        expect(outboxService.enqueue).not.toHaveBeenCalled();
    });

    it('changed: text has old + new time, type schedule_changed', async () => {
        const payload: IScheduleChangedPayload = {
            scheduleEntryId: 's1',
            oldStartTime: new Date('2026-06-16T09:00:00Z'),
            newStartTime: inWindow,
            oldDurationMinutes: 60,
            newDurationMinutes: 60,
            snapshot: snapshot(inWindow),
        };
        await listener.handleChanged(payload);
        const first = outboxService.enqueue.mock.calls[0][0];
        expect(first.type).toBe('schedule_changed');
        expect(first.payload.text).toContain('Изменение в расписании');
        expect(first.payload.text).toContain('Было:');
    });

    it('changed: duration-only edit shows the duration line, not a time diff', async () => {
        const payload: IScheduleChangedPayload = {
            scheduleEntryId: 's1',
            oldStartTime: inWindow,
            newStartTime: inWindow,
            oldDurationMinutes: 60,
            newDurationMinutes: 90,
            snapshot: snapshot(inWindow),
        };
        await listener.handleChanged(payload);
        const first = outboxService.enqueue.mock.calls[0][0];
        expect(first.payload.text).toContain('Длительность');
        expect(first.payload.text).toContain('90');
        expect(first.payload.text).not.toContain('Было:');
    });

    it('cancelled: type schedule_cancelled, includes reason', async () => {
        const payload: IScheduleCancelledPayload = {
            scheduleEntryId: 's1',
            cancellationReason: 'Тренер заболел',
            affectedCustomerIds: [],
            snapshot: snapshot(inWindow),
        };
        await listener.handleCancelled(payload);
        const first = outboxService.enqueue.mock.calls[0][0];
        expect(first.type).toBe('schedule_cancelled');
        expect(first.payload.text).toContain('отменено');
        expect(first.payload.text).toContain('Тренер заболел');
    });

    it('deleted: type schedule_deleted, cancelled-style copy', async () => {
        const payload: IScheduleDeletedPayload = { scheduleEntryId: 's1', snapshot: snapshot(inWindow) };
        await listener.handleDeleted(payload);
        const first = outboxService.enqueue.mock.calls[0][0];
        expect(first.type).toBe('schedule_deleted');
        expect(first.payload.text).toContain('отменено');
    });

    it('no-op when there are no recipients', async () => {
        botSubscriberService.findActiveRecipients.mockResolvedValueOnce([]);
        await listener.handleCreated({ scheduleEntryId: 's1', snapshot: snapshot(inWindow) });
        expect(outboxService.enqueue).not.toHaveBeenCalled();
    });

    it('swallows enqueue failures (never throws to the event bus)', async () => {
        outboxService.enqueue.mockRejectedValueOnce(new Error('db down'));
        await expect(
            listener.handleCreated({ scheduleEntryId: 's1', snapshot: snapshot(inWindow) }),
        ).resolves.toBeUndefined();
    });
});
