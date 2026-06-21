import { Test, type TestingModule } from '@nestjs/testing';
import { GrammyError } from 'grammy';

import { BotSubscriberService } from '../../bot-subscriber/bot-subscriber.service';
import { BotService } from '../../bot/bot.service';
import { NotificationOutboxDispatcher } from '../notification-outbox-dispatcher.service';
import { NotificationOutboxService } from '../notification-outbox.service';

function forbiddenError(): GrammyError {
    // 403 — triggers BotService.isPermanentSendError (checks error_code === 403 || 400)
    return new GrammyError(
        'Call to sendMessage failed!',
        { ok: false, error_code: 403, description: 'Forbidden: bot was blocked by the user' },
        'sendMessage',
        {},
    );
}

describe('NotificationOutboxDispatcher — permanent failure deactivates subscriber', () => {
    let dispatcher: NotificationOutboxDispatcher;
    let outboxService: { findDue: jest.Mock; markSent: jest.Mock; recordFailure: jest.Mock };
    let botService: { sendNotification: jest.Mock };
    let botSubscribers: { deactivate: jest.Mock };

    beforeEach(async () => {
        const row = {
            id: 'o1',
            attemptCount: 0,
            type: 'schedule_changed',
            payload: { telegramId: 111, text: 'x' },
        };
        outboxService = {
            findDue: jest.fn().mockResolvedValueOnce([row]).mockResolvedValue([]),
            markSent: jest.fn().mockResolvedValue(undefined),
            recordFailure: jest.fn().mockResolvedValue(undefined),
        };
        botService = { sendNotification: jest.fn().mockRejectedValue(forbiddenError()) };
        botSubscribers = { deactivate: jest.fn().mockResolvedValue(undefined) };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                NotificationOutboxDispatcher,
                { provide: NotificationOutboxService, useValue: outboxService },
                { provide: BotService, useValue: botService },
                { provide: BotSubscriberService, useValue: botSubscribers },
            ],
        }).compile();
        dispatcher = module.get(NotificationOutboxDispatcher);
    });

    it('deactivates the subscriber and records a terminal failure on 403', async () => {
        await dispatcher.tick();
        expect(botSubscribers.deactivate).toHaveBeenCalledWith(111);
        expect(outboxService.recordFailure).toHaveBeenCalledWith('o1', Number.MAX_SAFE_INTEGER, expect.anything());
    });
});
