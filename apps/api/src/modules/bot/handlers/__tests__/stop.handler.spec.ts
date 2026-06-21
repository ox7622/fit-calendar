import type { Bot, Context } from 'grammy';

import type { BotSubscriberService } from '../../../bot-subscriber/bot-subscriber.service';
import { registerStopCommand } from '../stop.handler';

function makeBot() {
    const handlers: { command: Record<string, (ctx: Context) => Promise<void>> } = { command: {} };
    const bot = {
        command: jest.fn((name: string, fn: (ctx: Context) => Promise<void>) => (handlers.command[name] = fn)),
    } as unknown as Bot<Context>;
    return { bot, handlers };
}

describe('registerStopCommand', () => {
    it('/stop deactivates the sender and replies', async () => {
        const subscribers = { deactivate: jest.fn().mockResolvedValue(undefined) };
        const { bot, handlers } = makeBot();
        registerStopCommand(bot, subscribers as unknown as BotSubscriberService);
        const reply = jest.fn().mockResolvedValue(undefined);
        await handlers.command['stop']({ from: { id: 7 }, reply } as unknown as Context);
        expect(subscribers.deactivate).toHaveBeenCalledWith(7);
        expect(reply).toHaveBeenCalledWith(expect.stringContaining('отписались'));
    });
});
