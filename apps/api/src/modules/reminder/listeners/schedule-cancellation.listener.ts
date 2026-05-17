import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { format, isSameDay } from 'date-fns';
import { ru } from 'date-fns/locale';

import type { IScheduleCancelledPayload } from '../../admin/schedule/schedule.events';
import { SCHEDULE_CANCELLED_EVENT } from '../../admin/schedule/schedule.events';
import { BotService } from '../../bot/bot.service';
import { CustomerService } from '../../customer/customer.service';
import { DEFAULT_NOTIFICATION_BACKOFF_MS, withRetry } from '../utils/retry';

@Injectable()
export class ScheduleCancellationListener {
    private readonly logger = new Logger(ScheduleCancellationListener.name);

    constructor(private readonly customerService: CustomerService, private readonly botService: BotService) {}

    /**
     * Story 5.5 — reacts to SCHEDULE_CANCELLED_EVENT from Story 6.4's admin
     * cancel flow. The event's `snapshot` carries everything we need for the
     * message (className, startTime, coachName) so there's no DB roundtrip
     * for class details — `affectedCustomerIds` is the only thing we look up.
     *
     * Out-of-band, same shape as Story 5.4: failures here do NOT touch
     * `Reminder.status` (6.4 already deleted the pending reminders inside
     * its transaction).
     */
    @OnEvent(SCHEDULE_CANCELLED_EVENT)
    async handleScheduleCancelled(payload: IScheduleCancelledPayload): Promise<void> {
        if (payload.affectedCustomerIds.length === 0) {
            return;
        }

        const recipients = await this.customerService.findTelegramIdsByCustomerIds(payload.affectedCustomerIds);
        if (recipients.length === 0) {
            return;
        }

        const message = this.buildMessage(payload);

        await Promise.all(
            recipients.map((recipient) =>
                this.sendOne(recipient.telegramId, message, payload.scheduleEntryId).catch((err) => {
                    this.logger.error(
                        {
                            event: 'schedule.cancelled.notify_failed',
                            scheduleEntryId: payload.scheduleEntryId,
                            telegramId: recipient.telegramId,
                            error: err instanceof Error ? err.message : String(err),
                        },
                        'Cancellation notification failed after retries',
                    );
                }),
            ),
        );
    }

    private async sendOne(telegramId: number, text: string, scheduleEntryId: string): Promise<void> {
        await withRetry(() => this.botService.sendNotification(telegramId, text), DEFAULT_NOTIFICATION_BACKOFF_MS);
        this.logger.log({ scheduleEntryId, telegramId }, 'Cancellation notification sent');
    }

    private buildMessage(payload: IScheduleCancelledPayload): string {
        const lines = [
            '❌ <b>Занятие отменено</b>',
            '',
            `<b>${escapeHtml(payload.snapshot.className)}</b>`,
            `🗓 ${this.formatTiming(payload.snapshot.startTime)}`,
            `👤 Тренер: ${escapeHtml(payload.snapshot.coachName)}`,
        ];
        const reason = payload.cancellationReason?.trim();
        if (reason) {
            lines.push('', `Причина: ${escapeHtml(reason)}`);
        }
        return lines.join('\n');
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
}

function escapeHtml(value: string): string {
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
