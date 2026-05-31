import { NotificationOutbox } from '@fitcalendar/db';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { GrammyError, InlineKeyboard } from 'grammy';

import { BotNotInitializedError, BotService } from '../bot/bot.service';

import { NotificationOutboxService } from './notification-outbox.service';

/** Max rows processed per dispatcher tick. Keeps the loop bounded. */
const TICK_BATCH = 50;

/** Max concurrent sends per tick. Same cap as the 5.3 reminder dispatcher. */
const SEND_CONCURRENCY = 5;

/**
 * Drains `notification_outbox` rows. Runs every minute. Replaces the
 * in-process `withRetry` that 5.4/5.5 listeners used; survives API restart
 * because the row is the source of truth.
 *
 * Race-safety across replicas comes from Commit I (advisory lock); for now
 * the in-memory `isProcessing` boolean is correct for a single instance.
 */
@Injectable()
export class NotificationOutboxDispatcher {
    private readonly logger = new Logger(NotificationOutboxDispatcher.name);
    private isProcessing = false;

    constructor(private readonly outboxService: NotificationOutboxService, private readonly botService: BotService) {}

    @Cron(CronExpression.EVERY_MINUTE)
    async tick(): Promise<void> {
        if (this.isProcessing) {
            this.logger.warn('Previous outbox tick still in flight; skipping');
            return;
        }
        this.isProcessing = true;
        try {
            const due = await this.outboxService.findDue(new Date(), TICK_BATCH);
            if (due.length === 0) return;

            this.logger.log(`Processing ${due.length} outbox row(s)`);
            await this.runWithConcurrency(due, SEND_CONCURRENCY, (row) =>
                this.processOne(row).catch((err) => {
                    this.logger.error({ outboxId: row.id, err }, 'Unhandled error processing outbox row');
                }),
            );
        } finally {
            this.isProcessing = false;
        }
    }

    private async processOne(row: NotificationOutbox): Promise<void> {
        const keyboard = this.buildKeyboard(row.payload.webAppUrl);
        try {
            await this.botService.sendNotification(row.payload.telegramId, row.payload.text, {
                replyMarkup: keyboard,
            });
            await this.outboxService.markSent(row.id);
            this.logger.log(
                { outboxId: row.id, type: row.type, telegramId: row.payload.telegramId },
                'Outbox notification sent',
            );
        } catch (err) {
            await this.handleSendFailure(row, err);
        }
    }

    private async handleSendFailure(row: NotificationOutbox, err: unknown): Promise<void> {
        const nextAttempt = row.attemptCount + 1;
        const isPermanent = BotService.isPermanentSendError(err);
        const isBotMisconfigured = err instanceof BotNotInitializedError;

        this.logger.error(
            {
                outboxId: row.id,
                type: row.type,
                attempt: nextAttempt,
                telegramErrorCode: err instanceof GrammyError ? err.error_code : undefined,
                errorMessage: err instanceof Error ? err.message : String(err),
                permanent: isPermanent || isBotMisconfigured,
            },
            'Outbox notification delivery failed',
        );

        if (isPermanent) {
            // User blocked the bot or chat doesn't exist — short-circuit retries.
            // Force the row to terminal 'failed' regardless of attempt count.
            await this.outboxService.recordFailure(row.id, Number.MAX_SAFE_INTEGER, err);
            return;
        }

        await this.outboxService.recordFailure(row.id, row.attemptCount, err);
    }

    private buildKeyboard(webAppUrl?: string): InlineKeyboard | undefined {
        if (!webAppUrl) return undefined;
        return new InlineKeyboard().webApp('📅 Открыть', webAppUrl);
    }

    private async runWithConcurrency<T>(items: T[], limit: number, worker: (item: T) => Promise<void>): Promise<void> {
        const queue = [...items];
        const runners = Array.from({ length: Math.min(limit, queue.length) }, async () => {
            while (queue.length > 0) {
                const next = queue.shift();
                if (next !== undefined) await worker(next);
            }
        });
        await Promise.all(runners);
    }
}
