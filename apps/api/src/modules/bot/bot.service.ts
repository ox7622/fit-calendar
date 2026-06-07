import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { BotError, Context, InlineKeyboard } from 'grammy';
import { Bot, GrammyError } from 'grammy';
import type { Update } from 'grammy/types';

import { ClubService } from '../club/club.service';
import { ScheduleService } from '../schedule/schedule.service';

export class BotNotInitializedError extends Error {
    constructor() {
        super('Telegram bot is not initialized (TELEGRAM_BOT_TOKEN missing or invalid)');
        this.name = 'BotNotInitializedError';
    }
}

export interface ISendNotificationOptions {
    replyMarkup?: InlineKeyboard;
}

import { registerClubCommand } from './handlers/club.handler';
import { BOT_COMMANDS, registerScheduleCommands } from './handlers/schedule.handler';
import { registerStartCommand } from './handlers/start.handler';

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

    constructor(
        private readonly configService: ConfigService,
        private readonly scheduleService: ScheduleService,
        private readonly clubService: ClubService,
    ) {}

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
        registerStartCommand(this.bot, this.clubService, miniAppUrl);
        registerScheduleCommands(this.bot, this.scheduleService, miniAppUrl);
        registerClubCommand(this.bot, this.clubService);

        // Initialize the bot (but don't start polling)
        await this.bot.init();

        // Populate the "/" command menu so users pick commands instead of typing.
        try {
            await this.bot.api.setMyCommands(BOT_COMMANDS);
        } catch (error) {
            this.logger.warn('Failed to set bot command menu', error);
        }

        // The menu button (left of the input) expands the slash-command list
        // populated above, so users can pick /today, /tomorrow, /week, etc.
        try {
            await this.bot.api.setChatMenuButton({ menu_button: { type: 'commands' } });
        } catch (error) {
            this.logger.warn('Failed to set chat menu button', error);
        }

        this.logger.log(`Bot @${this.bot.botInfo.username} initialized`);

        // Register webhook if we have the secret and API URL.
        // BOT_MODE=polling means the standalone bot owns updates (local dev via
        // the tunnel script). Registering a webhook here would make Telegram
        // reject the polling getUpdates with a 409 conflict, so skip it — the
        // two modes are mutually exclusive by design.
        const botMode = this.configService.get<string>('BOT_MODE');
        const apiUrl = this.configService.get<string>('API_URL');
        if (botMode === 'polling') {
            this.logger.log('BOT_MODE=polling — standalone bot owns updates; skipping webhook registration');
        } else if (apiUrl && webhookSecret) {
            // `API_URL` is the bare public origin (e.g. https://api.fitcalendar.ru).
            // The webhook controller lives behind the global API prefix
            // (NX_BE_API_FITCALENDAR_SERVICE_PREFIX, default "api"), so the
            // registered URL must include it or Telegram POSTs to a 404.
            const apiPrefix = this.configService.get<string>('NX_BE_API_FITCALENDAR_SERVICE_PREFIX') ?? 'api';
            await this.registerWebhook(BotService.buildWebhookUrl(apiUrl, apiPrefix), webhookSecret);
        }
    }

    /**
     * Builds the public webhook URL Telegram will POST to. Kept static + pure so
     * the prefix-handling (the part that previously 404'd) is unit-testable
     * without standing up onModuleInit. Trims stray slashes so both
     * `https://host` and `https://host/` produce one clean URL.
     */
    static buildWebhookUrl(apiUrl: string, apiPrefix: string): string {
        const origin = apiUrl.replace(/\/+$/, '');
        const prefix = apiPrefix.replace(/^\/+|\/+$/g, '');
        return prefix ? `${origin}/${prefix}/bot/webhook` : `${origin}/bot/webhook`;
    }

    private async registerWebhook(webhookUrl: string, secret: string): Promise<void> {
        if (!this.bot) return;

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

    /**
     * Story 5.3 — outbound notification used by the reminder dispatcher.
     * Throws `BotNotInitializedError` if the bot wasn't configured (no token)
     * so the dispatcher can log it without silently marking reminders as failed
     * for the wrong reason. Telegram API errors (network, 403 blocked, 5xx)
     * propagate as `GrammyError` for the caller's retry logic.
     */
    async sendNotification(telegramId: number, text: string, options: ISendNotificationOptions = {}): Promise<void> {
        if (!this.bot) {
            throw new BotNotInitializedError();
        }
        await this.bot.api.sendMessage(telegramId, text, {
            parse_mode: 'HTML',
            reply_markup: options.replyMarkup,
        });
    }

    /**
     * Tells the dispatcher whether a Telegram error means "don't retry — it'll
     * never succeed" (e.g. user blocked the bot) vs "transient — try again next tick".
     */
    static isPermanentSendError(err: unknown): boolean {
        if (!(err instanceof GrammyError)) return false;
        // 403 — bot was blocked by the user, or chat not found.
        // 400 — typically "chat not found" when the user never started the bot.
        return err.error_code === 403 || err.error_code === 400;
    }
}
