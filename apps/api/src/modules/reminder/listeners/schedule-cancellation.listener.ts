import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { format, isSameDay } from 'date-fns';
import { ru } from 'date-fns/locale';

import type { IScheduleCancelledPayload } from '../../admin/schedule/schedule.events';
import { SCHEDULE_CANCELLED_EVENT } from '../../admin/schedule/schedule.events';
import { CustomerService } from '../../customer/customer.service';
import { NotificationOutboxService } from '../notification-outbox.service';

@Injectable()
export class ScheduleCancellationListener {
    private readonly logger = new Logger(ScheduleCancellationListener.name);

    constructor(
        private readonly customerService: CustomerService,
        private readonly outboxService: NotificationOutboxService,
    ) {}

    /**
     * Story 5.5 — reacts to SCHEDULE_CANCELLED_EVENT from Story 6.4's admin
     * cancel flow. The event's `snapshot` carries everything we need for the
     * message (className, startTime, coachName) so there's no DB roundtrip
     * for class details — `affectedCustomerIds` is the only thing we look up.
     *
     * Enqueues per-recipient outbox rows; the outbox dispatcher handles
     * delivery + retries. Out-of-band relative to the Reminder lifecycle —
     * 6.4 already deleted the pending reminders inside its transaction.
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

        const text = this.buildMessage(payload);

        await Promise.all(
            recipients.map((recipient) =>
                this.outboxService
                    .enqueue({
                        customerId: recipient.id,
                        type: 'schedule_cancelled',
                        payload: {
                            telegramId: recipient.telegramId,
                            text,
                            scheduleEntryId: payload.scheduleEntryId,
                        },
                    })
                    .catch((err) => {
                        this.logger.error(
                            {
                                event: 'schedule.cancelled.enqueue_failed',
                                scheduleEntryId: payload.scheduleEntryId,
                                telegramId: recipient.telegramId,
                                error: err instanceof Error ? err.message : String(err),
                            },
                            'Failed to enqueue cancellation notification',
                        );
                    }),
            ),
        );
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
