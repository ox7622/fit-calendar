import type { Bot, Context } from 'grammy';

import type { BotSubscriberService } from '../../../bot-subscriber/bot-subscriber.service';
import { registerContactCapture } from '../contact-capture.handler';

function makeBot() {
    const handlers: { middleware?: (ctx: Context, next: () => Promise<void>) => Promise<void> } = {};
    const bot = { use: jest.fn((fn) => (handlers.middleware = fn)) } as unknown as Bot<Context>;
    return { bot, handlers };
}

describe('registerContactCapture', () => {
    let subscribers: { upsert: jest.Mock };
    beforeEach(() => (subscribers = { upsert: jest.fn().mockResolvedValue(undefined) }));

    it('upserts the human sender then calls next', async () => {
        const { bot, handlers } = makeBot();
        registerContactCapture(bot, subscribers as unknown as BotSubscriberService);
        const next = jest.fn().mockResolvedValue(undefined);
        await handlers.middleware!(
            { from: { id: 5, first_name: 'Ия', username: 'iya', is_bot: false } } as unknown as Context,
            next,
        );
        expect(subscribers.upsert).toHaveBeenCalledWith(
            expect.objectContaining({ telegramId: 5, source: 'bot', firstName: 'Ия', username: 'iya' }),
        );
        expect(next).toHaveBeenCalled();
    });

    it('skips upsert for bot senders / missing from, still calls next', async () => {
        const { bot, handlers } = makeBot();
        registerContactCapture(bot, subscribers as unknown as BotSubscriberService);
        const next = jest.fn().mockResolvedValue(undefined);
        await handlers.middleware!({ from: { id: 9, is_bot: true } } as unknown as Context, next);
        await handlers.middleware!({} as unknown as Context, next);
        expect(subscribers.upsert).not.toHaveBeenCalled();
        expect(next).toHaveBeenCalledTimes(2);
    });
});
