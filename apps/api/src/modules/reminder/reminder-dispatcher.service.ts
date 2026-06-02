/**
 * Story 5.3 — outbound reminder delivery.
 *
 * **Scaling caveat (MVP):** the single-flight lock below is an in-memory
 * boolean, which is correct for a single API instance. Running multiple
 * replicas WILL cause duplicate sends — each replica thinks it holds the
 * lock independently. Before scaling out, replace `isProcessing` with a
 * Postgres advisory lock (`pg_try_advisory_lock`) or Redis-based mutex.
 */
import type { Reminder } from '@fitcalendar/db';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { format, isSameDay } from 'date-fns';
import { ru } from 'date-fns/locale';
import { GrammyError, InlineKeyboard } from 'grammy';

import { BotNotInitializedError, BotService } from '../bot/bot.service';

import { MAX_RETRY_ATTEMPTS, ReminderService } from './reminder.service';

/** Max concurrent sends per tick. Far below the Telegram per-bot rate cap (~30/sec). */
const SEND_CONCURRENCY = 5;

@Injectable()
export class ReminderDispatcherService {
    private readonly logger = new Logger(ReminderDispatcherService.name);
    private isProcessing = false;
    private readonly miniAppUrl: string | undefined;

    constructor(
        private readonly reminderService: ReminderService,
        private readonly botService: BotService,
        configService: ConfigService,
    ) {
        this.miniAppUrl = configService.get<string>('MINI_APP_URL');
        if (!this.miniAppUrl) {
            this.logger.warn(
                'MINI_APP_URL not configured — reminder messages will be sent without a deep-link button.',
            );
        }
    }

    @Cron(CronExpression.EVERY_MINUTE)
    async processDueReminders(): Promise<void> {
        if (this.isProcessing) {
            this.logger.warn('Previous reminder tick still in flight; skipping');
            return;
        }
        this.isProcessing = true;
        try {
            const due = await this.reminderService.findDueReminders();
            if (due.length === 0) return;

            this.logger.log(`Processing ${due.length} due reminder(s)`);
            await this.runWithConcurrency(due, SEND_CONCURRENCY, (reminder) =>
                this.processOne(reminder).catch((err) => {
                    // Defense in depth — processOne already catches/logs its own errors,
                    // but a programmer mistake (e.g. throwing during status update) must
                    // not abort the whole batch (AC10).
                    this.logger.error({ reminderId: reminder.id, err }, 'Unhandled error processing reminder');
                }),
            );
        } finally {
            this.isProcessing = false;
        }
    }

    private async processOne(reminder: Reminder): Promise<void> {
        if (!reminder.customer || !reminder.scheduleEntry) {
            // Loaded by `findDueReminders` with relations, but guard anyway.
            this.logger.error({ reminderId: reminder.id }, 'Reminder missing customer/scheduleEntry relations');
            await this.reminderService.recordFailure(reminder.id, reminder.retryCount);
            return;
        }
        if (reminder.customer.telegramId === null) {
            // Customer was admin-unlinked between subscription and send; skip permanently.
            this.logger.warn({ reminderId: reminder.id }, 'Customer has no Telegram identity; marking failed');
            await this.markPermanentFailure(reminder.id);
            return;
        }

        const message = this.buildMessageBody(reminder);
        const keyboard = this.buildKeyboard(reminder.scheduleEntryId);
        const telegramId = Number(reminder.customer.telegramId);

        try {
            await this.botService.sendNotification(telegramId, message, { replyMarkup: keyboard });
            await this.reminderService.markSent(reminder.id);
            this.logger.log({ reminderId: reminder.id, telegramId }, 'Reminder sent');
        } catch (err) {
            await this.handleSendFailure(reminder, err);
        }
    }

    private async handleSendFailure(reminder: Reminder, err: unknown): Promise<void> {
        const attempt = reminder.retryCount + 1;
        const isPermanent = BotService.isPermanentSendError(err);
        const isBotMisconfigured = err instanceof BotNotInitializedError;

        this.logger.error(
            {
                reminderId: reminder.id,
                attempt,
                maxAttempts: MAX_RETRY_ATTEMPTS,
                telegramErrorCode: err instanceof GrammyError ? err.error_code : undefined,
                errorMessage: err instanceof Error ? err.message : String(err),
                permanent: isPermanent || isBotMisconfigured,
            },
            'Reminder delivery failed',
        );

        if (isPermanent) {
            // User blocked the bot or chat doesn't exist — short-circuit retries (per Dev Notes).
            await this.markPermanentFailure(reminder.id);
            return;
        }

        await this.reminderService.recordFailure(reminder.id, reminder.retryCount);
    }

    private async markPermanentFailure(reminderId: string): Promise<void> {
        // Force status='failed' immediately regardless of retryCount.
        await this.reminderService.recordFailure(reminderId, MAX_RETRY_ATTEMPTS - 1);
    }

    /**
     * Build the message body (HTML for grammY's `parse_mode: 'HTML'`).
     * Format defined in Story 5.3 Dev Notes §"Message format".
     */
    private buildMessageBody(reminder: Reminder): string {
        const entry = reminder.scheduleEntry;
        const className = entry.trainingType?.name ?? 'Занятие';
        const coachName = entry.coach?.name ?? '—';
        const timing = this.formatTiming(entry.startTime);

        return [
            '🔔 <b>Напоминание о занятии</b>',
            '',
            `<b>${escapeHtml(className)}</b>`,
            `🕘 ${timing}`,
            `👤 Тренер: ${escapeHtml(coachName)}`,
        ].join('\n');
    }

    private formatTiming(startTime: Date): string {
        const now = new Date();
        const sameDay = isSameDay(startTime, now);
        const tomorrow = new Date(now);
        tomorrow.setDate(now.getDate() + 1);
        const isTomorrow = isSameDay(startTime, tomorrow);

        const hhmm = format(startTime, 'HH:mm', { locale: ru });
        if (sameDay) return `Сегодня в ${hhmm}`;
        if (isTomorrow) return `Завтра в ${hhmm}`;
        return `${format(startTime, 'd MMMM', { locale: ru })} в ${hhmm}`;
    }

    private buildKeyboard(scheduleEntryId: string): InlineKeyboard | undefined {
        if (!this.miniAppUrl) return undefined;
        return new InlineKeyboard().webApp('📅 Открыть', `${this.miniAppUrl}/schedule/${scheduleEntryId}`);
    }

    /**
     * Run `tasks` with at most `limit` in flight at once. Simple manual semaphore
     * to avoid pulling in `p-limit` for a single use site.
     */
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

function escapeHtml(value: string): string {
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
