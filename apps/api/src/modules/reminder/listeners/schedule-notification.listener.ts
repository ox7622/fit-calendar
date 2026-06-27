import type { TOutboxNotificationType } from '@fitcalendar/db';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';

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
import { BotSubscriberService } from '../../bot-subscriber/bot-subscriber.service';
import { ClubService } from '../../club/club.service';
import { escapeHtml, formatTimingRu } from '../notification-format';
import { NotificationOutboxService } from '../notification-outbox.service';
import { isWithinNotifyWindow } from '../notify-window';

/**
 * Single subscriber for all admin schedule mutations. Replaces the per-action
 * Story 5.4/5.5 listeners. Broadcasts to ALL active bot subscribers,
 * gated to the 5-day notify window. Snapshot-driven — never reads the DB.
 */
@Injectable()
export class ScheduleNotificationListener {
    private readonly logger = new Logger(ScheduleNotificationListener.name);
    private readonly miniAppUrl: string | undefined;

    constructor(
        private readonly botSubscribers: BotSubscriberService,
        private readonly outboxService: NotificationOutboxService,
        configService: ConfigService,
        private readonly clubService: ClubService,
    ) {
        this.miniAppUrl = configService.get<string>('MINI_APP_URL');
    }

    @OnEvent(SCHEDULE_CREATED_EVENT)
    async handleCreated(payload: IScheduleCreatedPayload): Promise<void> {
        const tz = await this.clubService.getTimeZone();
        await this.broadcast({
            type: 'schedule_created',
            scheduleEntryId: payload.scheduleEntryId,
            gateStartTime: payload.snapshot.startTime,
            text: this.createdMessage(payload.snapshot, tz),
        });
    }

    @OnEvent(SCHEDULE_CHANGED_EVENT)
    async handleChanged(payload: IScheduleChangedPayload): Promise<void> {
        const tz = await this.clubService.getTimeZone();
        await this.broadcast({
            type: 'schedule_changed',
            scheduleEntryId: payload.scheduleEntryId,
            gateStartTime: payload.newStartTime,
            text: this.changedMessage(payload, tz),
        });
    }

    @OnEvent(SCHEDULE_CANCELLED_EVENT)
    async handleCancelled(payload: IScheduleCancelledPayload): Promise<void> {
        const tz = await this.clubService.getTimeZone();
        await this.broadcast({
            type: 'schedule_cancelled',
            scheduleEntryId: payload.scheduleEntryId,
            gateStartTime: payload.snapshot.startTime,
            text: this.cancelledMessage(payload.snapshot, payload.cancellationReason, tz),
        });
    }

    @OnEvent(SCHEDULE_DELETED_EVENT)
    async handleDeleted(payload: IScheduleDeletedPayload): Promise<void> {
        const tz = await this.clubService.getTimeZone();
        await this.broadcast({
            type: 'schedule_deleted',
            scheduleEntryId: payload.scheduleEntryId,
            gateStartTime: payload.snapshot.startTime,
            // A deleted class reads to the user as a cancellation — reuse that copy by design.
            text: this.cancelledMessage(payload.snapshot, null, tz),
        });
    }

    private async broadcast(opts: {
        type: TOutboxNotificationType;
        scheduleEntryId: string;
        gateStartTime: Date;
        text: string;
    }): Promise<void> {
        if (!isWithinNotifyWindow(opts.gateStartTime, new Date())) return;

        const recipients = await this.botSubscribers.findActiveRecipients();
        if (recipients.length === 0) return;

        const webAppUrl = this.miniAppUrl ? `${this.miniAppUrl}/schedule/${opts.scheduleEntryId}` : undefined;

        await Promise.all(
            recipients.map((recipient) =>
                this.outboxService
                    .enqueue({
                        customerId: null,
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

    private createdMessage(s: IScheduleSnapshot, tz: string): string {
        return [
            '🆕 <b>Новое занятие</b>',
            '',
            `<b>${escapeHtml(s.className)}</b>`,
            `🗓 ${formatTimingRu(s.startTime, tz)}`,
            `👤 Тренер: ${escapeHtml(s.coachName)}`,
        ].join('\n');
    }

    private changedMessage(p: IScheduleChangedPayload, tz: string): string {
        const timeChanged = p.oldStartTime.getTime() !== p.newStartTime.getTime();
        const durationChanged = p.oldDurationMinutes !== p.newDurationMinutes;

        const lines = ['⚠️ <b>Изменение в расписании</b>', '', `Занятие <b>${escapeHtml(p.snapshot.className)}</b>`];
        if (timeChanged) {
            lines.push(`❌ <s>Было: ${formatTimingRu(p.oldStartTime, tz)}</s>`);
            lines.push(`✅ Будет: <b>${formatTimingRu(p.newStartTime, tz)}</b>`);
        } else {
            // Duration-only edit: the time didn't move, so show it once (no Было/Будет diff).
            lines.push(`🗓 ${formatTimingRu(p.newStartTime, tz)}`);
        }
        if (durationChanged) {
            lines.push(`⏱ Длительность: ${p.oldDurationMinutes} → ${p.newDurationMinutes} мин`);
        }
        lines.push(`👤 Тренер: ${escapeHtml(p.snapshot.coachName)}`);
        return lines.join('\n');
    }

    private cancelledMessage(s: IScheduleSnapshot, reason: string | null, tz: string): string {
        const lines = [
            '❌ <b>Занятие отменено</b>',
            '',
            `<b>${escapeHtml(s.className)}</b>`,
            `🗓 ${formatTimingRu(s.startTime, tz)}`,
            `👤 Тренер: ${escapeHtml(s.coachName)}`,
        ];
        const trimmed = reason?.trim();
        if (trimmed) lines.push('', `Причина: ${escapeHtml(trimmed)}`);
        return lines.join('\n');
    }
}
