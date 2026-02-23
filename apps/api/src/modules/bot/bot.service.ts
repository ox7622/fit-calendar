import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { BotError, Context } from 'grammy';
import { Bot } from 'grammy';
import type { Update } from 'grammy/types';

import { ScheduleService } from '../schedule/schedule.service';

import { registerStartCommand } from './handlers/start.handler';
import { registerTodayCommand } from './handlers/today.handler';

export interface IWebhookUpdate {
    update_id: number;
    message?: {
        message_id: number;
        from?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
        };
        chat: {
            id: number;
            type: string;
        };
        text?: string;
        date: number;
    };
    callback_query?: {
        id: string;
        from: {
            id: number;
            first_name: string;
        };
        data?: string;
    };
}

@Injectable()
export class BotService implements OnModuleInit {
    private bot: Bot<Context> | null = null;
    private readonly logger = new Logger(BotService.name);

    constructor(private readonly configService: ConfigService, private readonly scheduleService: ScheduleService) {}

    async onModuleInit(): Promise<void> {
        const token = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
        const webhookSecret = this.configService.get<string>('TELEGRAM_WEBHOOK_SECRET');
        const miniAppUrl = this.configService.get<string>('MINI_APP_URL');

        if (!token) {
            this.logger.warn('TELEGRAM_BOT_TOKEN not configured, bot features disabled');
            return;
        }

        this.bot = new Bot<Context>(token);

        // Register error handler
        this.bot.catch((error: BotError<Context>) => {
            const ctx = error.ctx;
            const err = error.error;

            this.logger.error(
                {
                    updateId: ctx.update.update_id,
                    chatId: ctx.chat?.id,
                    userId: ctx.from?.id,
                    errorName: err instanceof Error ? err.name : 'UnknownError',
                    errorMessage: err instanceof Error ? err.message : String(err),
                },
                'Bot error occurred',
            );
        });

        // Register commands
        registerStartCommand(this.bot, miniAppUrl);
        registerTodayCommand(this.bot, this.scheduleService, miniAppUrl);

        // Initialize the bot (but don't start polling)
        await this.bot.init();

        this.logger.log(`Bot @${this.bot.botInfo.username} initialized`);

        // Register webhook if we have the secret and API URL
        const apiUrl = this.configService.get<string>('API_URL');
        if (apiUrl && webhookSecret) {
            await this.registerWebhook(apiUrl, webhookSecret);
        }
    }

    private async registerWebhook(apiUrl: string, secret: string): Promise<void> {
        if (!this.bot) return;

        const webhookUrl = `${apiUrl}/bot/webhook`;

        try {
            await this.bot.api.setWebhook(webhookUrl, {
                secret_token: secret,
            });
            this.logger.log(`Webhook registered at ${webhookUrl}`);
        } catch (error) {
            this.logger.error('Failed to register webhook', error);
        }
    }

    async handleUpdate(update: IWebhookUpdate): Promise<void> {
        if (!this.bot) {
            this.logger.warn('Bot not initialized, ignoring update');
            return;
        }

        try {
            await this.bot.handleUpdate(update as Update);
        } catch (error) {
            this.logger.error('Failed to handle update', error);
            throw error;
        }
    }

    getBot(): Bot<Context> | null {
        return this.bot;
    }
}
