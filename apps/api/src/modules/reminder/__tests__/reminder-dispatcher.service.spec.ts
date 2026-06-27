import type { Customer, Reminder, ScheduleEntry } from '@fitcalendar/db';
import type { ConfigService } from '@nestjs/config';
import { GrammyError } from 'grammy';

import type { BotService } from '../../bot/bot.service';
import type { ClubService } from '../../club/club.service';
import { ReminderDispatcherService } from '../reminder-dispatcher.service';
import type { ReminderService } from '../reminder.service';

const TELEGRAM_ID = 999;

const buildReminder = (overrides: Partial<Reminder> = {}): Reminder =>
    ({
        id: `rem-${Math.random().toString(36).slice(2, 8)}`,
        customerId: 'cust-1',
        scheduleEntryId: 'sched-1',
        notifyAt: new Date(),
        status: 'pending',
        retryCount: 0,
        sentAt: null,
        createdAt: new Date(),
        customer: { id: 'cust-1', telegramId: TELEGRAM_ID, reminderMinutes: 30 } as Customer,
        scheduleEntry: {
            id: 'sched-1',
            startTime: new Date(Date.now() + 30 * 60_000),
            durationMinutes: 60,
            status: 'scheduled',
            coach: { id: 'coach-1', name: 'Мария Иванова' },
            trainingType: { id: 'tt-1', name: 'Йога' },
        } as ScheduleEntry,
        ...overrides,
    } as Reminder);

function buildMockBot(): jest.Mocked<Pick<BotService, 'sendNotification'>> {
    return { sendNotification: jest.fn().mockResolvedValue(undefined) };
}

function buildMockReminderService(): jest.Mocked<
    Pick<ReminderService, 'findDueReminders' | 'markSent' | 'recordFailure'>
> {
    return {
        findDueReminders: jest.fn().mockResolvedValue([]),
        markSent: jest.fn().mockResolvedValue(undefined),
        recordFailure: jest.fn().mockResolvedValue({ status: 'pending' }),
    };
}

function buildConfig(miniAppUrl: string | undefined = 'https://app.example.com'): ConfigService {
    return { get: jest.fn().mockReturnValue(miniAppUrl) } as unknown as ConfigService;
}

function buildClubService(timeZone = 'Europe/Moscow'): ClubService {
    return { getTimeZone: async () => timeZone } as unknown as ClubService;
}

describe('ReminderDispatcherService', () => {
    let reminderService: ReturnType<typeof buildMockReminderService>;
    let botService: ReturnType<typeof buildMockBot>;
    let dispatcher: ReminderDispatcherService;

    beforeEach(() => {
        reminderService = buildMockReminderService();
        botService = buildMockBot();
        dispatcher = new ReminderDispatcherService(
            reminderService as unknown as ReminderService,
            botService as unknown as BotService,
            buildConfig(),
            buildClubService(),
        );
    });

    it('processes every due reminder returned by the query', async () => {
        const reminders = [buildReminder(), buildReminder(), buildReminder()];
        reminderService.findDueReminders.mockResolvedValueOnce(reminders);

        await dispatcher.processDueReminders();

        expect(botService.sendNotification).toHaveBeenCalledTimes(3);
        expect(reminderService.markSent).toHaveBeenCalledTimes(3);
    });

    it('updates a successfully-sent reminder via markSent', async () => {
        const reminder = buildReminder({ id: 'rem-success' });
        reminderService.findDueReminders.mockResolvedValueOnce([reminder]);

        await dispatcher.processDueReminders();

        expect(botService.sendNotification).toHaveBeenCalledWith(
            TELEGRAM_ID,
            expect.stringContaining('Йога'),
            expect.objectContaining({ replyMarkup: expect.any(Object) }),
        );
        expect(reminderService.markSent).toHaveBeenCalledWith('rem-success');
    });

    it('records a transient failure as pending (retry next tick)', async () => {
        const reminder = buildReminder({ id: 'rem-retry', retryCount: 0 });
        reminderService.findDueReminders.mockResolvedValueOnce([reminder]);
        botService.sendNotification.mockRejectedValueOnce(new Error('network blip'));

        await dispatcher.processDueReminders();

        expect(reminderService.markSent).not.toHaveBeenCalled();
        expect(reminderService.recordFailure).toHaveBeenCalledWith('rem-retry', 0);
    });

    it('marks the reminder permanently failed after 3 attempts (retryCount=2 fails)', async () => {
        const reminder = buildReminder({ id: 'rem-exhausted', retryCount: 2 });
        reminderService.findDueReminders.mockResolvedValueOnce([reminder]);
        botService.sendNotification.mockRejectedValueOnce(new Error('still failing'));

        await dispatcher.processDueReminders();

        // recordFailure is called with the current count; the service flips status
        // to 'failed' internally when newRetryCount >= MAX_RETRY_ATTEMPTS.
        expect(reminderService.recordFailure).toHaveBeenCalledWith('rem-exhausted', 2);
    });

    it('short-circuits retries on permanent Telegram errors (403 blocked)', async () => {
        const reminder = buildReminder({ id: 'rem-blocked', retryCount: 0 });
        reminderService.findDueReminders.mockResolvedValueOnce([reminder]);

        const grammyError = Object.create(GrammyError.prototype) as GrammyError;
        Object.assign(grammyError, {
            message: 'Forbidden: bot was blocked by the user',
            error_code: 403,
        });
        botService.sendNotification.mockRejectedValueOnce(grammyError);

        await dispatcher.processDueReminders();

        // Permanent error → mark failed via MAX_RETRY_ATTEMPTS - 1 (2), so newCount=3 flips status to 'failed'.
        expect(reminderService.recordFailure).toHaveBeenCalledWith('rem-blocked', 2);
    });

    it('one failure does NOT abort the batch — other reminders still process', async () => {
        const r1 = buildReminder({ id: 'rem-1' });
        const r2 = buildReminder({ id: 'rem-2' });
        const r3 = buildReminder({ id: 'rem-3' });
        reminderService.findDueReminders.mockResolvedValueOnce([r1, r2, r3]);
        botService.sendNotification
            .mockResolvedValueOnce(undefined)
            .mockRejectedValueOnce(new Error('boom'))
            .mockResolvedValueOnce(undefined);

        await dispatcher.processDueReminders();

        expect(botService.sendNotification).toHaveBeenCalledTimes(3);
        expect(reminderService.markSent).toHaveBeenCalledWith('rem-1');
        expect(reminderService.markSent).toHaveBeenCalledWith('rem-3');
        expect(reminderService.markSent).not.toHaveBeenCalledWith('rem-2');
        expect(reminderService.recordFailure).toHaveBeenCalledWith('rem-2', 0);
    });

    it('skips a tick when the previous one is still in flight (single-flight lock)', async () => {
        // Deferred-promise pattern from the story's Dev Notes — without it the
        // test is flaky because mockResolvedValue resolves in a microtask that
        // may interleave with the second invocation unpredictably.
        let resolveFirst: (value: Reminder[]) => void = () => undefined;
        const firstQuery = new Promise<Reminder[]>((r) => {
            resolveFirst = r;
        });
        reminderService.findDueReminders.mockReturnValueOnce(firstQuery);

        const p1 = dispatcher.processDueReminders();
        const p2 = dispatcher.processDueReminders(); // sees isProcessing=true, returns early

        resolveFirst([]);
        await Promise.all([p1, p2]);

        expect(reminderService.findDueReminders).toHaveBeenCalledTimes(1);
    });

    it('releases the single-flight lock even when findDueReminders throws', async () => {
        reminderService.findDueReminders.mockRejectedValueOnce(new Error('db down'));

        await expect(dispatcher.processDueReminders()).rejects.toThrow('db down');

        // Second invocation should be allowed to proceed.
        reminderService.findDueReminders.mockResolvedValueOnce([]);
        await dispatcher.processDueReminders();
        expect(reminderService.findDueReminders).toHaveBeenCalledTimes(2);
    });

    it('skips reminders whose customer has no Telegram identity (unlinked mid-flight)', async () => {
        const unlinkedReminder = buildReminder({
            id: 'rem-unlinked',
            customer: { id: 'cust-1', telegramId: null, reminderMinutes: 30 } as Customer,
        });
        reminderService.findDueReminders.mockResolvedValueOnce([unlinkedReminder]);

        await dispatcher.processDueReminders();

        expect(botService.sendNotification).not.toHaveBeenCalled();
        // Marked permanently failed (recordFailure(id, MAX_RETRY_ATTEMPTS - 1))
        expect(reminderService.recordFailure).toHaveBeenCalledWith('rem-unlinked', 2);
    });

    it('builds message body with class name, formatted time, and coach', async () => {
        const startTime = new Date();
        startTime.setHours(10, 30, 0, 0); // today at 10:30
        const reminder = buildReminder({
            scheduleEntry: {
                id: 'sched-x',
                startTime,
                durationMinutes: 60,
                status: 'scheduled',
                coach: { id: 'c', name: 'Алексей' },
                trainingType: { id: 't', name: 'Силовая' },
            } as ScheduleEntry,
        });
        reminderService.findDueReminders.mockResolvedValueOnce([reminder]);

        await dispatcher.processDueReminders();

        const [, message] = botService.sendNotification.mock.calls[0];
        expect(message).toContain('Силовая');
        expect(message).toContain('Алексей');
        expect(message).toContain('Сегодня в 10:30');
        expect(message).toContain('🔔');
    });
});
