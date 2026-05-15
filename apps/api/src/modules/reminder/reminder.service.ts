import { Reminder, ScheduleEntry } from '@fitcalendar/db';
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { subMinutes } from 'date-fns';
import { LessThanOrEqual, QueryFailedError, Repository } from 'typeorm';

import { ReminderResponseDto, toReminderResponse } from './dto/reminder-response.dto';

const PG_UNIQUE_VIOLATION = '23505';

/**
 * Total send attempts per reminder before giving up (Story 5.3 AC7).
 * 1 initial + up to 2 retries on subsequent cron ticks.
 */
export const MAX_RETRY_ATTEMPTS = 3;

interface ICustomerSubscribeContext {
    customerId: string;
    reminderMinutes: number;
}

@Injectable()
export class ReminderService {
    private readonly logger = new Logger(ReminderService.name);

    constructor(
        @InjectRepository(Reminder)
        private readonly reminderRepo: Repository<Reminder>,
        @InjectRepository(ScheduleEntry)
        private readonly scheduleRepo: Repository<ScheduleEntry>,
    ) {}

    /**
     * AC2/5/7/9 — idempotent + race-safe subscription.
     *
     * Two concurrent requests can both pass the existing-row pre-check and race
     * the insert. Postgres rejects the loser with a unique-constraint violation
     * (code 23505 on `UQ_..._customerId_scheduleEntryId`). The catch block
     * re-fetches the winner and returns it, so the loser sees a 200 with the
     * winner's row instead of a 500.
     */
    async subscribe(context: ICustomerSubscribeContext, scheduleEntryId: string): Promise<ReminderResponseDto> {
        const entry = await this.scheduleRepo.findOne({ where: { id: scheduleEntryId } });
        if (!entry) {
            throw new NotFoundException('Занятие не найдено');
        }
        if (entry.status === 'cancelled') {
            throw new BadRequestException('Занятие отменено');
        }
        if (entry.startTime.getTime() <= Date.now()) {
            throw new BadRequestException('Занятие уже началось');
        }

        const existing = await this.reminderRepo.findOne({
            where: { customerId: context.customerId, scheduleEntryId },
        });
        if (existing) {
            return toReminderResponse(existing);
        }

        const reminder = this.reminderRepo.create({
            customerId: context.customerId,
            scheduleEntryId,
            notifyAt: subMinutes(entry.startTime, context.reminderMinutes),
            status: 'pending',
        });

        try {
            const saved = await this.reminderRepo.save(reminder);
            this.logger.log(`Customer ${context.customerId} subscribed to ${scheduleEntryId}`);
            return toReminderResponse(saved);
        } catch (err) {
            if (this.isUniqueViolation(err)) {
                const winner = await this.reminderRepo.findOne({
                    where: { customerId: context.customerId, scheduleEntryId },
                });
                if (winner) {
                    return toReminderResponse(winner);
                }
            }
            throw err;
        }
    }

    /**
     * AC6 — owner-scoped delete with no existence leakage. The query gates on
     * `id` *and* `customerId`, so a request to delete someone else's reminder
     * looks identical (404) to a request to delete a non-existent reminder.
     */
    async unsubscribe(customerId: string, reminderId: string): Promise<void> {
        const reminder = await this.reminderRepo.findOne({ where: { id: reminderId, customerId } });
        if (!reminder) {
            throw new NotFoundException('Напоминание не найдено');
        }
        await this.reminderRepo.remove(reminder);
        this.logger.log(`Customer ${customerId} unsubscribed from reminder ${reminderId}`);
    }

    /**
     * Used by Story 5.6's GET /reminders. 5.1 does not expose this via an
     * endpoint — the ClassDetailPage button tracks its own state until 5.6.
     */
    findOneByCustomerAndEntry(customerId: string, scheduleEntryId: string): Promise<Reminder | null> {
        return this.reminderRepo.findOne({ where: { customerId, scheduleEntryId } });
    }

    /**
     * Story 5.3 — pulls everything the dispatcher needs to build a message
     * in one query. Excludes reminders that have hit `MAX_RETRY_ATTEMPTS`
     * so failed sends drop out of the working set automatically.
     */
    findDueReminders(now: Date = new Date(), batchSize = 100): Promise<Reminder[]> {
        return this.reminderRepo.find({
            where: {
                status: 'pending',
                notifyAt: LessThanOrEqual(now),
                retryCount: LessThanOrEqual(MAX_RETRY_ATTEMPTS - 1),
            },
            relations: ['customer', 'scheduleEntry', 'scheduleEntry.coach', 'scheduleEntry.trainingType'],
            order: { notifyAt: 'ASC' },
            take: batchSize,
        });
    }

    async markSent(reminderId: string): Promise<void> {
        await this.reminderRepo.update({ id: reminderId }, { status: 'sent', sentAt: new Date() });
    }

    /**
     * Record a failed attempt. After `MAX_RETRY_ATTEMPTS` total attempts the
     * status flips to 'failed' and the reminder drops out of `findDueReminders`.
     */
    async recordFailure(reminderId: string, currentRetryCount: number): Promise<{ status: 'pending' | 'failed' }> {
        const newRetryCount = currentRetryCount + 1;
        const isExhausted = newRetryCount >= MAX_RETRY_ATTEMPTS;
        await this.reminderRepo.update(
            { id: reminderId },
            { retryCount: newRetryCount, status: isExhausted ? 'failed' : 'pending' },
        );
        return { status: isExhausted ? 'failed' : 'pending' };
    }

    private isUniqueViolation(err: unknown): boolean {
        if (!(err instanceof QueryFailedError)) return false;
        return (err as QueryFailedError & { code?: string }).code === PG_UNIQUE_VIOLATION;
    }
}
