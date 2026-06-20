import type { Bot, Context } from 'grammy';

import { registerScheduleCommands } from '../register-schedule-commands';
import type { IWeekDay, ScheduleDataSource } from '../types';

function makeWeek(): IWeekDay[] {
    return Array.from({ length: 7 }, (_, i) => ({ date: `2026-06-${12 + i}`, classes: [] }));
}

function makeBot() {
    const handlers: {
        command: Record<string, (ctx: Context) => Promise<void>>;
        callback?: (ctx: Context) => Promise<void>;
    } = { command: {} };
    const bot = {
        command: jest.fn((name: string, fn: (ctx: Context) => Promise<void>) => {
            handlers.command[name] = fn;
        }),
        callbackQuery: jest.fn((_trigger: unknown, fn: (ctx: Context) => Promise<void>) => {
            handlers.callback = fn;
        }),
    } as unknown as Bot<Context>;
    return { bot, handlers };
}

describe('registerScheduleCommands', () => {
    let dataSource: jest.Mocked<ScheduleDataSource>;

    beforeEach(() => {
        dataSource = {
            getToday: jest.fn().mockResolvedValue([]),
            getByDate: jest.fn().mockResolvedValue([]),
            getWeek: jest.fn().mockResolvedValue(makeWeek()),
        };
    });

    it('registers the three commands and the week callback', () => {
        const { bot } = makeBot();
        registerScheduleCommands(bot, dataSource);
        expect(bot.command).toHaveBeenCalledWith('today', expect.any(Function));
        expect(bot.command).toHaveBeenCalledWith('tomorrow', expect.any(Function));
        expect(bot.command).toHaveBeenCalledWith('week', expect.any(Function));
        expect(bot.callbackQuery).toHaveBeenCalledWith(expect.any(RegExp), expect.any(Function));
    });

    it('/week replies with week 0', async () => {
        const { bot, handlers } = makeBot();
        registerScheduleCommands(bot, dataSource);
        const reply = jest.fn().mockResolvedValue(undefined);
        await handlers.command['week']({ reply } as unknown as Context);
        expect(dataSource.getWeek).toHaveBeenCalledWith(0);
        expect(reply).toHaveBeenCalledWith(
            expect.stringContaining('📅 Неделя'),
            expect.objectContaining({ reply_markup: expect.anything() }),
        );
    });

    it('the callback edits the message to the parsed offset and answers', async () => {
        const { bot, handlers } = makeBot();
        registerScheduleCommands(bot, dataSource);
        const editMessageText = jest.fn().mockResolvedValue(undefined);
        const answerCallbackQuery = jest.fn().mockResolvedValue(undefined);
        await handlers.callback!({
            match: ['week:3', '3'],
            editMessageText,
            answerCallbackQuery,
        } as unknown as Context);
        expect(dataSource.getWeek).toHaveBeenCalledWith(3);
        expect(editMessageText).toHaveBeenCalledWith(
            expect.stringContaining('📅 Неделя'),
            expect.objectContaining({ reply_markup: expect.anything() }),
        );
        expect(answerCallbackQuery).toHaveBeenCalled();
    });

    it('the callback reports a load failure without editing', async () => {
        const { bot, handlers } = makeBot();
        dataSource.getWeek.mockRejectedValueOnce(new Error('boom'));
        registerScheduleCommands(bot, dataSource);
        const editMessageText = jest.fn();
        const answerCallbackQuery = jest.fn().mockResolvedValue(undefined);
        await handlers.callback!({
            match: ['week:1', '1'],
            editMessageText,
            answerCallbackQuery,
        } as unknown as Context);
        expect(editMessageText).not.toHaveBeenCalled();
        expect(answerCallbackQuery).toHaveBeenCalledWith(expect.objectContaining({ text: expect.any(String) }));
    });

    it('swallows a stale-edit error but still answers', async () => {
        const { bot, handlers } = makeBot();
        registerScheduleCommands(bot, dataSource);
        const editMessageText = jest.fn().mockRejectedValue(new Error('message is not modified'));
        const answerCallbackQuery = jest.fn().mockResolvedValue(undefined);
        await expect(
            handlers.callback!({ match: ['week:2', '2'], editMessageText, answerCallbackQuery } as unknown as Context),
        ).resolves.toBeUndefined();
        expect(answerCallbackQuery).toHaveBeenCalled();
    });
});
