import type { Context } from 'grammy';
import { Bot } from 'grammy';
import pino from 'pino';

import { registerStartCommand } from './commands/start.command';
import { registerTodayCommand } from './commands/today.command';
import { errorMiddleware } from './middleware/error.middleware';

export interface IBotConfig {
    token: string;
    miniAppUrl?: string;
}

const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    transport:
        process.env.NODE_ENV !== 'production' ? { target: 'pino-pretty', options: { colorize: true } } : undefined,
});

export function createBot(config: IBotConfig): Bot<Context> {
    const bot = new Bot<Context>(config.token);

    // Register error handler
    bot.catch(errorMiddleware(logger));

    // Register commands
    registerStartCommand(bot, config.miniAppUrl);
    registerTodayCommand(bot, config.miniAppUrl);

    return bot;
}

export { logger };
