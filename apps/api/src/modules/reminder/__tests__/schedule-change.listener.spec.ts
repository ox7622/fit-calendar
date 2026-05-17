import { ScheduleEntry } from '@fitcalendar/db';
import { ConfigService } from '@nestjs/config';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import type { IScheduleChangedPayload } from '../../admin/schedule/schedule.events';
import { BotService } from '../../bot/bot.service';
import { ScheduleChangeNotificationListener } from '../listeners/schedule-change.listener';
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
    let botService: jest.Mocked<Pick<BotService, 'sendNotification'>>;
    let configService: { get: jest.Mock };

    beforeEach(async () => {
        scheduleRepo = { findOne: jest.fn() };
        reminderService = { findPendingByClassWithCustomer: jest.fn().mockResolvedValue([]) };
        botService = { sendNotification: jest.fn().mockResolvedValue(undefined) };
        configService = { get: jest.fn().mockReturnValue('https://app.example.com') };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ScheduleChangeNotificationListener,
                { provide: getRepositoryToken(ScheduleEntry), useValue: scheduleRepo },
                { provide: ReminderService, useValue: reminderService },
                { provide: BotService, useValue: botService },
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();

        listener = module.get(ScheduleChangeNotificationListener);
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('sends one message per subscriber with old + new time, class name, and coach', async () => {
        scheduleRepo.findOne.mockResolvedValueOnce(baseEntry());
        reminderService.findPendingByClassWithCustomer.mockResolvedValueOnce([
            { reminderId: 'r1', telegramId: 111, firstName: 'Анна' },
            { reminderId: 'r2', telegramId: 222, firstName: 'Борис' },
        ]);

        await listener.handleScheduleChanged(basePayload());

        expect(botService.sendNotification).toHaveBeenCalledTimes(2);
        const [tg1, text1, opts1] = botService.sendNotification.mock.calls[0];
        expect(tg1).toBe(111);
        expect(text1).toContain('Изменение в расписании');
        expect(text1).toContain('Йога');
        expect(text1).toContain('Мария');
        expect(text1).toContain('Было:');
        expect(text1).toContain('Будет:');
        expect(opts1?.replyMarkup).toBeDefined();
    });

    it('builds a deep-link button to /schedule/:id', async () => {
        scheduleRepo.findOne.mockResolvedValueOnce(baseEntry());
        reminderService.findPendingByClassWithCustomer.mockResolvedValueOnce([
            { reminderId: 'r1', telegramId: 111, firstName: 'Анна' },
        ]);

        await listener.handleScheduleChanged(basePayload());

        const opts = botService.sendNotification.mock.calls[0][2];
        // grammY InlineKeyboard exposes `inline_keyboard` as the serialized form.
        const buttons = opts?.replyMarkup?.inline_keyboard?.[0];
        expect(buttons?.[0]).toMatchObject({
            text: expect.stringContaining('Открыть'),
            web_app: { url: 'https://app.example.com/schedule/sched-1' },
        });
    });

    it('is a no-op when nobody is subscribed', async () => {
        scheduleRepo.findOne.mockResolvedValueOnce(baseEntry());
        reminderService.findPendingByClassWithCustomer.mockResolvedValueOnce([]);

        await listener.handleScheduleChanged(basePayload());

        expect(botService.sendNotification).not.toHaveBeenCalled();
    });

    it('bails out silently when the class has vanished (deleted between emit and handle)', async () => {
        scheduleRepo.findOne.mockResolvedValueOnce(null);

        await listener.handleScheduleChanged(basePayload());

        expect(reminderService.findPendingByClassWithCustomer).not.toHaveBeenCalled();
        expect(botService.sendNotification).not.toHaveBeenCalled();
    });

    it('bails out when the class was cancelled after the edit (5.5 takes over)', async () => {
        scheduleRepo.findOne.mockResolvedValueOnce(baseEntry({ status: 'cancelled' }));

        await listener.handleScheduleChanged(basePayload());

        expect(reminderService.findPendingByClassWithCustomer).not.toHaveBeenCalled();
        expect(botService.sendNotification).not.toHaveBeenCalled();
    });

    it('retries transient send failures and succeeds on the third attempt', async () => {
        jest.useFakeTimers();
        scheduleRepo.findOne.mockResolvedValueOnce(baseEntry());
        reminderService.findPendingByClassWithCustomer.mockResolvedValueOnce([
            { reminderId: 'r1', telegramId: 111, firstName: 'Анна' },
        ]);
        botService.sendNotification
            .mockRejectedValueOnce(new Error('5xx'))
            .mockRejectedValueOnce(new Error('5xx'))
            .mockResolvedValueOnce(undefined);

        const handlePromise = listener.handleScheduleChanged(basePayload());
        // Advance through the [1s, 5s] delays between attempts 1→2 and 2→3.
        await jest.advanceTimersByTimeAsync(1_000);
        await jest.advanceTimersByTimeAsync(5_000);
        await handlePromise;

        expect(botService.sendNotification).toHaveBeenCalledTimes(3);
    });

    it('logs and swallows when all 4 attempts fail (does not throw to the event bus)', async () => {
        jest.useFakeTimers();
        scheduleRepo.findOne.mockResolvedValueOnce(baseEntry());
        reminderService.findPendingByClassWithCustomer.mockResolvedValueOnce([
            { reminderId: 'r1', telegramId: 111, firstName: 'Анна' },
        ]);
        botService.sendNotification.mockRejectedValue(new Error('persistent 5xx'));

        const handlePromise = listener.handleScheduleChanged(basePayload());
        await jest.advanceTimersByTimeAsync(1_000);
        await jest.advanceTimersByTimeAsync(5_000);
        await jest.advanceTimersByTimeAsync(30_000);
        await expect(handlePromise).resolves.toBeUndefined();

        expect(botService.sendNotification).toHaveBeenCalledTimes(4);
    });
});
