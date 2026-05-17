import { ScheduleEntry } from '@fitcalendar/db';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { format, isSameDay } from 'date-fns';
import { ru } from 'date-fns/locale';
import { InlineKeyboard } from 'grammy';
import { Repository } from 'typeorm';

import type { IScheduleChangedPayload } from '../../admin/schedule/schedule.events';
import { SCHEDULE_CHANGED_EVENT } from '../../admin/schedule/schedule.events';
import { BotService } from '../../bot/bot.service';
import { ReminderService } from '../reminder.service';
import { DEFAULT_NOTIFICATION_BACKOFF_MS, withRetry } from '../utils/retry';

@Injectable()
export class ScheduleChangeNotificationListener {
    private readonly logger = new Logger(ScheduleChangeNotificationListener.name);
    private readonly miniAppUrl: string | undefined;

    constructor(
        @InjectRepository(ScheduleEntry)
        private readonly scheduleRepo: Repository<ScheduleEntry>,
        private readonly reminderService: ReminderService,
        private readonly botService: BotService,
        configService: ConfigService,
    ) {
        this.miniAppUrl = configService.get<string>('MINI_APP_URL');
    }

    /**
     * Story 5.4 — reacts to SCHEDULE_CHANGED_EVENT (emitted by Story 6.3's
     * admin update flow when startTime or durationMinutes changes). Sends
     * each subscriber a "this class moved" message with old/new times.
     *
     * Out-of-band relative to the Reminder lifecycle: failures here do NOT
     * touch `Reminder.status` (which tracks the *original* reminder send,
     * not change notifications). Worst case: user misses the change-notice
     * and just sees the updated time in the Mini App.
     */
    @OnEvent(SCHEDULE_CHANGED_EVENT)
    async handleScheduleChanged(payload: IScheduleChangedPayload): Promise<void> {
        const entry = await this.scheduleRepo.findOne({
            where: { id: payload.scheduleEntryId },
            relations: ['coach', 'trainingType'],
        });
        if (!entry) {
            this.logger.warn(
                { scheduleEntryId: payload.scheduleEntryId },
                'Schedule entry vanished before change notification could be sent',
            );
            return;
        }
        if (entry.status === 'cancelled') {
            // Race with admin cancelling immediately after editing.
            // Story 5.5's cancellation listener will fire next; nothing to do here.
            this.logger.log(
                { scheduleEntryId: payload.scheduleEntryId },
                'Class cancelled after edit; skipping change notification (5.5 will notify)',
            );
            return;
        }

        const subscribers = await this.reminderService.findPendingByClassWithCustomer(payload.scheduleEntryId);
        if (subscribers.length === 0) {
            return;
        }

        const message = this.buildMessage({
            className: entry.trainingType?.name ?? 'Занятие',
            coachName: entry.coach?.name ?? '—',
            oldStartTime: payload.oldStartTime,
            newStartTime: payload.newStartTime,
        });
        const keyboard = this.buildKeyboard(payload.scheduleEntryId);

        await Promise.all(
            subscribers.map((sub) =>
                this.sendOne(sub.telegramId, message, keyboard, payload.scheduleEntryId).catch((err) => {
                    this.logger.error(
                        {
                            event: 'schedule.changed.notify_failed',
                            scheduleEntryId: payload.scheduleEntryId,
                            telegramId: sub.telegramId,
                            error: err instanceof Error ? err.message : String(err),
                        },
                        'Schedule-change notification failed after retries',
                    );
                }),
            ),
        );
    }

    private async sendOne(
        telegramId: number,
        text: string,
        keyboard: InlineKeyboard | undefined,
        scheduleEntryId: string,
    ): Promise<void> {
        await withRetry(
            () => this.botService.sendNotification(telegramId, text, { replyMarkup: keyboard }),
            DEFAULT_NOTIFICATION_BACKOFF_MS,
        );
        this.logger.log({ scheduleEntryId, telegramId }, 'Schedule-change notification sent');
    }

    private buildMessage(input: {
        className: string;
        coachName: string;
        oldStartTime: Date;
        newStartTime: Date;
    }): string {
        return [
            '⚠️ <b>Изменение в расписании</b>',
            '',
            `Занятие <b>${escapeHtml(input.className)}</b>`,
            `❌ <s>Было: ${this.formatTiming(input.oldStartTime)}</s>`,
            `✅ Будет: <b>${this.formatTiming(input.newStartTime)}</b>`,
            `👤 Тренер: ${escapeHtml(input.coachName)}`,
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
}

function escapeHtml(value: string): string {
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
