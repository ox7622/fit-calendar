import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import type { IScheduleCancelledPayload } from '../../admin/schedule/schedule.events';
import { BotService } from '../../bot/bot.service';
import { CustomerService } from '../../customer/customer.service';
import { ScheduleCancellationListener } from '../listeners/schedule-cancellation.listener';

const basePayload = (overrides: Partial<IScheduleCancelledPayload> = {}): IScheduleCancelledPayload => ({
    scheduleEntryId: 'sched-1',
    cancellationReason: null,
    affectedCustomerIds: ['cust-a', 'cust-b'],
    snapshot: {
        className: 'Йога',
        startTime: new Date('2026-06-01T10:00:00Z'),
        coachName: 'Мария',
    },
    ...overrides,
});

describe('ScheduleCancellationListener', () => {
    let listener: ScheduleCancellationListener;
    let customerService: jest.Mocked<Pick<CustomerService, 'findTelegramIdsByCustomerIds'>>;
    let botService: jest.Mocked<Pick<BotService, 'sendNotification'>>;

    beforeEach(async () => {
        customerService = { findTelegramIdsByCustomerIds: jest.fn().mockResolvedValue([]) };
        botService = { sendNotification: jest.fn().mockResolvedValue(undefined) };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ScheduleCancellationListener,
                { provide: CustomerService, useValue: customerService },
                { provide: BotService, useValue: botService },
            ],
        }).compile();

        listener = module.get(ScheduleCancellationListener);
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('sends one message per recipient with class name, time, and coach', async () => {
        customerService.findTelegramIdsByCustomerIds.mockResolvedValueOnce([
            { id: 'cust-a', telegramId: 111, firstName: 'Анна' },
            { id: 'cust-b', telegramId: 222, firstName: 'Борис' },
        ]);

        await listener.handleScheduleCancelled(basePayload());

        expect(customerService.findTelegramIdsByCustomerIds).toHaveBeenCalledWith(['cust-a', 'cust-b']);
        expect(botService.sendNotification).toHaveBeenCalledTimes(2);
        const [, text] = botService.sendNotification.mock.calls[0];
        expect(text).toContain('Занятие отменено');
        expect(text).toContain('Йога');
        expect(text).toContain('Мария');
    });

    it('includes "Причина:" line when reason is provided', async () => {
        customerService.findTelegramIdsByCustomerIds.mockResolvedValueOnce([
            { id: 'cust-a', telegramId: 111, firstName: 'Анна' },
        ]);

        await listener.handleScheduleCancelled(basePayload({ cancellationReason: 'Тренер заболел' }));

        const text = botService.sendNotification.mock.calls[0][1];
        expect(text).toContain('Причина: Тренер заболел');
    });

    it('omits "Причина:" line when reason is null', async () => {
        customerService.findTelegramIdsByCustomerIds.mockResolvedValueOnce([
            { id: 'cust-a', telegramId: 111, firstName: 'Анна' },
        ]);

        await listener.handleScheduleCancelled(basePayload({ cancellationReason: null }));

        const text = botService.sendNotification.mock.calls[0][1];
        expect(text).not.toContain('Причина');
    });

    it('is a no-op when affectedCustomerIds is empty (no customer lookup, no sends)', async () => {
        await listener.handleScheduleCancelled(basePayload({ affectedCustomerIds: [] }));

        expect(customerService.findTelegramIdsByCustomerIds).not.toHaveBeenCalled();
        expect(botService.sendNotification).not.toHaveBeenCalled();
    });

    it('is a no-op when all affected customers have null telegramId (filtered by repo)', async () => {
        customerService.findTelegramIdsByCustomerIds.mockResolvedValueOnce([]);

        await listener.handleScheduleCancelled(basePayload());

        expect(botService.sendNotification).not.toHaveBeenCalled();
    });

    it('logs and swallows when all 4 send attempts fail (does not throw to the event bus)', async () => {
        jest.useFakeTimers();
        customerService.findTelegramIdsByCustomerIds.mockResolvedValueOnce([
            { id: 'cust-a', telegramId: 111, firstName: 'Анна' },
        ]);
        botService.sendNotification.mockRejectedValue(new Error('persistent 5xx'));

        const handlePromise = listener.handleScheduleCancelled(basePayload());
        await jest.advanceTimersByTimeAsync(1_000);
        await jest.advanceTimersByTimeAsync(5_000);
        await jest.advanceTimersByTimeAsync(30_000);
        await expect(handlePromise).resolves.toBeUndefined();

        expect(botService.sendNotification).toHaveBeenCalledTimes(4);
    });
});
