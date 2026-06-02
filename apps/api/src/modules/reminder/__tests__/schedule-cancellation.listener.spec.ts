import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import type { IScheduleCancelledPayload } from '../../admin/schedule/schedule.events';
import { CustomerService } from '../../customer/customer.service';
import { ScheduleCancellationListener } from '../listeners/schedule-cancellation.listener';
import { NotificationOutboxService } from '../notification-outbox.service';

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
    let outboxService: jest.Mocked<Pick<NotificationOutboxService, 'enqueue'>>;

    beforeEach(async () => {
        customerService = { findTelegramIdsByCustomerIds: jest.fn().mockResolvedValue([]) };
        outboxService = { enqueue: jest.fn().mockResolvedValue(undefined) };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ScheduleCancellationListener,
                { provide: CustomerService, useValue: customerService },
                { provide: NotificationOutboxService, useValue: outboxService },
            ],
        }).compile();

        listener = module.get(ScheduleCancellationListener);
    });

    it('enqueues one outbox row per recipient with class name, time, and coach', async () => {
        customerService.findTelegramIdsByCustomerIds.mockResolvedValueOnce([
            { id: 'cust-a', telegramId: 111, firstName: 'Анна' },
            { id: 'cust-b', telegramId: 222, firstName: 'Борис' },
        ]);

        await listener.handleScheduleCancelled(basePayload());

        expect(customerService.findTelegramIdsByCustomerIds).toHaveBeenCalledWith(['cust-a', 'cust-b']);
        expect(outboxService.enqueue).toHaveBeenCalledTimes(2);
        const first = outboxService.enqueue.mock.calls[0][0];
        expect(first).toMatchObject({ customerId: 'cust-a', type: 'schedule_cancelled' });
        expect(first.payload.telegramId).toBe(111);
        expect(first.payload.text).toContain('Занятие отменено');
        expect(first.payload.text).toContain('Йога');
        expect(first.payload.text).toContain('Мария');
    });

    it('includes "Причина:" line when reason is provided', async () => {
        customerService.findTelegramIdsByCustomerIds.mockResolvedValueOnce([
            { id: 'cust-a', telegramId: 111, firstName: 'Анна' },
        ]);

        await listener.handleScheduleCancelled(basePayload({ cancellationReason: 'Тренер заболел' }));

        expect(outboxService.enqueue.mock.calls[0][0].payload.text).toContain('Причина: Тренер заболел');
    });

    it('omits "Причина:" line when reason is null', async () => {
        customerService.findTelegramIdsByCustomerIds.mockResolvedValueOnce([
            { id: 'cust-a', telegramId: 111, firstName: 'Анна' },
        ]);

        await listener.handleScheduleCancelled(basePayload({ cancellationReason: null }));

        expect(outboxService.enqueue.mock.calls[0][0].payload.text).not.toContain('Причина');
    });

    it('is a no-op when affectedCustomerIds is empty (no customer lookup, no enqueue)', async () => {
        await listener.handleScheduleCancelled(basePayload({ affectedCustomerIds: [] }));

        expect(customerService.findTelegramIdsByCustomerIds).not.toHaveBeenCalled();
        expect(outboxService.enqueue).not.toHaveBeenCalled();
    });

    it('is a no-op when all affected customers have null telegramId (filtered by repo)', async () => {
        customerService.findTelegramIdsByCustomerIds.mockResolvedValueOnce([]);

        await listener.handleScheduleCancelled(basePayload());

        expect(outboxService.enqueue).not.toHaveBeenCalled();
    });

    it('logs and swallows enqueue failures (does not throw to the event bus)', async () => {
        customerService.findTelegramIdsByCustomerIds.mockResolvedValueOnce([
            { id: 'cust-a', telegramId: 111, firstName: 'Анна' },
        ]);
        outboxService.enqueue.mockRejectedValueOnce(new Error('db down'));

        await expect(listener.handleScheduleCancelled(basePayload())).resolves.toBeUndefined();
        expect(outboxService.enqueue).toHaveBeenCalledTimes(1);
    });
});
