import type { Bot, Context } from 'grammy';

import { registerFallbackHandler } from '../register-fallback-handler';

function makeBot() {
    const handlers: { message?: (ctx: Context) => Promise<void> } = {};
    const bot = {
        on: jest.fn((trigger: string, fn: (ctx: Context) => Promise<void>) => {
            if (trigger === 'message:text') handlers.message = fn;
        }),
    } as unknown as Bot<Context>;
    return { bot, handlers };
}

describe('registerFallbackHandler', () => {
    it('listens for plain text messages', () => {
        const { bot } = makeBot();
        registerFallbackHandler(bot);
        expect(bot.on).toHaveBeenCalledWith('message:text', expect.any(Function));
    });

    it('replies with the command hint on unrecognized text', async () => {
        const { bot, handlers } = makeBot();
        registerFallbackHandler(bot);
        const reply = jest.fn().mockResolvedValue(undefined);
        await handlers.message!({ reply } as unknown as Context);
        expect(reply).toHaveBeenCalledWith(expect.stringContaining('/today'), undefined);
    });

    it('attaches the mini-app button when a url is provided', async () => {
        const { bot, handlers } = makeBot();
        registerFallbackHandler(bot, 'https://app.example.com');
        const reply = jest.fn().mockResolvedValue(undefined);
        await handlers.message!({ reply } as unknown as Context);
        expect(reply).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({ reply_markup: expect.anything() }),
        );
    });
});
