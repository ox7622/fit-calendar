import type { TOutboxNotificationType } from '@fitcalendar/db';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import { format, isSameDay } from 'date-fns';
import { ru } from 'date-fns/locale';

import type {
    IScheduleCancelledPayload,
    IScheduleChangedPayload,
    IScheduleCreatedPayload,
    IScheduleDeletedPayload,
    IScheduleSnapshot,
} from '../../admin/schedule/schedule.events';
import {
    SCHEDULE_CANCELLED_EVENT,
    SCHEDULE_CHANGED_EVENT,
    SCHEDULE_CREATED_EVENT,
    SCHEDULE_DELETED_EVENT,
} from '../../admin/schedule/schedule.events';
import { CustomerService } from '../../customer/customer.service';
import { NotificationOutboxService } from '../notification-outbox.service';
import { isWithinNotifyWindow } from '../notify-window';

/**
 * Single subscriber for all admin schedule mutations. Replaces the per-action
 * Story 5.4/5.5 listeners. Broadcasts to ALL linked customers (not subscribers),
 * gated to the 5-day notify window. Snapshot-driven — never reads the DB.
 */
@Injectable()
export class ScheduleNotificationListener {
    private readonly logger = new Logger(ScheduleNotificationListener.name);
    private readonly miniAppUrl: string | undefined;

    constructor(
        private readonly customerService: CustomerService,
        private readonly outboxService: NotificationOutboxService,
        configService: ConfigService,
    ) {
        this.miniAppUrl = configService.get<string>('MINI_APP_URL');
    }

    @OnEvent(SCHEDULE_CREATED_EVENT)
    async handleCreated(payload: IScheduleCreatedPayload): Promise<void> {
        await this.broadcast({
            type: 'schedule_created',
            scheduleEntryId: payload.scheduleEntryId,
            gateStartTime: payload.snapshot.startTime,
            text: this.createdMessage(payload.snapshot),
        });
    }

    @OnEvent(SCHEDULE_CHANGED_EVENT)
    async handleChanged(payload: IScheduleChangedPayload): Promise<void> {
        await this.broadcast({
            type: 'schedule_changed',
            scheduleEntryId: payload.scheduleEntryId,
            gateStartTime: payload.newStartTime,
            text: this.changedMessage(payload),
        });
    }

    @OnEvent(SCHEDULE_CANCELLED_EVENT)
    async handleCancelled(payload: IScheduleCancelledPayload): Promise<void> {
        await this.broadcast({
            type: 'schedule_cancelled',
            scheduleEntryId: payload.scheduleEntryId,
            gateStartTime: payload.snapshot.startTime,
            text: this.cancelledMessage(payload.snapshot, payload.cancellationReason),
        });
    }

    @OnEvent(SCHEDULE_DELETED_EVENT)
    async handleDeleted(payload: IScheduleDeletedPayload): Promise<void> {
        await this.broadcast({
            type: 'schedule_deleted',
            scheduleEntryId: payload.scheduleEntryId,
            gateStartTime: payload.snapshot.startTime,
            text: this.cancelledMessage(payload.snapshot, null),
        });
    }

    private async broadcast(opts: {
        type: TOutboxNotificationType;
        scheduleEntryId: string;
        gateStartTime: Date;
        text: string;
    }): Promise<void> {
        if (!isWithinNotifyWindow(opts.gateStartTime, new Date())) return;

        const recipients = await this.customerService.findBroadcastRecipients();
        if (recipients.length === 0) return;

        const webAppUrl = this.miniAppUrl ? `${this.miniAppUrl}/schedule/${opts.scheduleEntryId}` : undefined;

        await Promise.all(
            recipients.map((recipient) =>
                this.outboxService
                    .enqueue({
                        customerId: recipient.id,
                        type: opts.type,
                        payload: {
                            telegramId: recipient.telegramId,
                            text: opts.text,
                            webAppUrl,
                            scheduleEntryId: opts.scheduleEntryId,
                        },
                    })
                    .catch((err) => {
                        this.logger.error(
                            {
                                event: 'schedule.broadcast.enqueue_failed',
                                type: opts.type,
                                scheduleEntryId: opts.scheduleEntryId,
                                telegramId: recipient.telegramId,
                                error: err instanceof Error ? err.message : String(err),
                            },
                            'Failed to enqueue schedule broadcast notification',
                        );
                    }),
            ),
        );
    }

    private createdMessage(s: IScheduleSnapshot): string {
        return [
            '🆕 <b>Новое занятие</b>',
            '',
            `<b>${escapeHtml(s.className)}</b>`,
            `🗓 ${this.formatTiming(s.startTime)}`,
            `👤 Тренер: ${escapeHtml(s.coachName)}`,
        ].join('\n');
    }

    private changedMessage(p: IScheduleChangedPayload): string {
        return [
            '⚠️ <b>Изменение в расписании</b>',
            '',
            `Занятие <b>${escapeHtml(p.snapshot.className)}</b>`,
            `❌ <s>Было: ${this.formatTiming(p.oldStartTime)}</s>`,
            `✅ Будет: <b>${this.formatTiming(p.newStartTime)}</b>`,
            `👤 Тренер: ${escapeHtml(p.snapshot.coachName)}`,
        ].join('\n');
    }

    private cancelledMessage(s: IScheduleSnapshot, reason: string | null): string {
        const lines = [
            '❌ <b>Занятие отменено</b>',
            '',
            `<b>${escapeHtml(s.className)}</b>`,
            `🗓 ${this.formatTiming(s.startTime)}`,
            `👤 Тренер: ${escapeHtml(s.coachName)}`,
        ];
        const trimmed = reason?.trim();
        if (trimmed) lines.push('', `Причина: ${escapeHtml(trimmed)}`);
        return lines.join('\n');
    }

    private formatTiming(startTime: Date): string {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(now.getDate() + 1);
        const hhmm = format(startTime, 'HH:mm', { locale: ru });
        if (isSameDay(startTime, now)) return `Сегодня в ${hhmm}`;
        if (isSameDay(startTime, tomorrow)) return `Завтра в ${hhmm}`;
        return `${format(startTime, 'd MMMM', { locale: ru })} в ${hhmm}`;
    }
}

function escapeHtml(value: string): string {
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
