import { Reminder, ScheduleEntry } from '@fitcalendar/db';
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { subMinutes } from 'date-fns';
import { EntityManager, QueryFailedError, Repository } from 'typeorm';

import { PG_UNIQUE_VIOLATION } from '../../common/constants';

import { ReminderListItemDto, toReminderListItem } from './dto/reminder-list-item.dto';
import { ReminderResponseDto, toReminderResponse } from './dto/reminder-response.dto';

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

    findOneByCustomerAndEntry(customerId: string, scheduleEntryId: string): Promise<Reminder | null> {
        return this.reminderRepo.findOne({ where: { customerId, scheduleEntryId } });
    }

    /**
     * Story 5.6 — list endpoint feed. Excludes reminders whose class is in the
     * past so the list is self-pruning (no separate "completed" view for MVP).
     * Uses createQueryBuilder because the startTime filter is on a related table.
     */
    async findActiveByCustomer(customerId: string, now: Date = new Date()): Promise<ReminderListItemDto[]> {
        const reminders = await this.reminderRepo
            .createQueryBuilder('r')
            .innerJoinAndSelect('r.scheduleEntry', 'entry')
            .innerJoinAndSelect('entry.coach', 'coach')
            .innerJoinAndSelect('entry.trainingType', 'type')
            .where('r.customerId = :customerId', { customerId })
            .andWhere('entry.startTime > :now', { now })
            .orderBy('entry.startTime', 'ASC')
            .getMany();

        return reminders.map(toReminderListItem);
    }

    /**
     * Story 5.3 — pulls everything the dispatcher needs to build a message
     * in one query. Excludes reminders that have hit `MAX_RETRY_ATTEMPTS`
     * so failed sends drop out of the working set automatically.
     *
     * Also excludes (Story 7.6 follow-up) reminders whose class falls inside
     * an active freeze on the customer's active membership: if the member
     * can't attend, we shouldn't ping them. The check is "the class's
     * startTime::date is within `[freeze.startDate, freeze.endDate]` on a
     * membership where `status='active'`". Customers with no active
     * membership pass through (no freeze → not excluded), which matches the
     * existing dispatcher behavior.
     */
    findDueReminders(now: Date = new Date(), batchSize = 100): Promise<Reminder[]> {
        return this.reminderRepo
            .createQueryBuilder('r')
            .leftJoinAndSelect('r.customer', 'customer')
            .leftJoinAndSelect('r.scheduleEntry', 'entry')
            .leftJoinAndSelect('entry.coach', 'coach')
            .leftJoinAndSelect('entry.trainingType', 'trainingType')
            .where('r.status = :pending', { pending: 'pending' })
            .andWhere('r.notifyAt <= :now', { now })
            .andWhere('r.retryCount <= :maxRetry', { maxRetry: MAX_RETRY_ATTEMPTS - 1 })
            .andWhere(
                `NOT EXISTS (
                    SELECT 1
                      FROM customer_memberships m
                      JOIN freeze_events f ON f."customerMembershipId" = m.id
                     WHERE m."customerId" = r."customerId"
                       AND m.status = 'active'
                       AND entry."startTime"::date BETWEEN f."startDate" AND f."endDate"
                )`,
            )
            .orderBy('r.notifyAt', 'ASC')
            .take(batchSize)
            .getMany();
    }

    async markSent(reminderId: string): Promise<void> {
        await this.reminderRepo.update({ id: reminderId }, { status: 'sent', sentAt: new Date() });
    }

    /**
     * Story 6.3 — when an admin shifts a class's startTime, every pending
     * reminder for that class needs its `notifyAt` recomputed against the
     * subscribing customer's current `reminderMinutes` preference.
     *
     * Already-sent and failed reminders are NOT touched — their `sentAt`
     * timestamp would lie if we modified them after the fact.
     *
     * Returns the count of rows updated for caller logging.
     */
    async recomputeNotifyAtForClass(scheduleEntryId: string, newStartTime: Date): Promise<number> {
        const reminders = await this.reminderRepo.find({
            where: { scheduleEntryId, status: 'pending' },
            relations: ['customer'],
        });

        if (reminders.length === 0) return 0;

        // Row-by-row update keeps per-customer reminderMinutes explicit.
        // For MVP volumes (low tens of reminders per class) this is clearer
        // than a single SQL expression and unambiguous in code review.
        await Promise.all(
            reminders.map((reminder) =>
                this.reminderRepo.update(
                    { id: reminder.id },
                    { notifyAt: subMinutes(newStartTime, reminder.customer.reminderMinutes) },
                ),
            ),
        );

        this.logger.log(`Recomputed notifyAt for ${reminders.length} pending reminder(s) on class ${scheduleEntryId}`);
        return reminders.length;
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

    /**
     * Story 6.4 — returns distinct customer UUIDs that have a pending reminder
     * for the given class. Captured BEFORE `deletePendingByClass` so the
     * cancellation event payload still names everyone who would have been
     * reminded (Story 5.5's listener uses this list to send notifications).
     *
     * Accepts an optional `EntityManager` so the caller can scope the read to
     * the same transaction as the subsequent `deletePendingByClass`. Without
     * it, a new subscriber slipping in between read and delete would be
     * silently removed from `reminders` but missing from the event payload.
     */
    async findPendingCustomersByClass(scheduleEntryId: string, manager?: EntityManager): Promise<string[]> {
        const repo = manager ? manager.getRepository(Reminder) : this.reminderRepo;
        const rows = await repo
            .createQueryBuilder('r')
            .select('DISTINCT r.customerId', 'customerId')
            .where('r.scheduleEntryId = :scheduleEntryId', { scheduleEntryId })
            .andWhere("r.status = 'pending'")
            .getRawMany<{ customerId: string }>();
        return rows.map((row) => row.customerId);
    }

    /**
     * Story 6.4 — bulk-delete pending reminders for a cancelled class. Accepts
     * an optional `EntityManager` so the delete participates in the caller's
     * transaction (the admin cancel flow updates schedule_entry + deletes
     * reminders atomically). `sent` / `failed` rows are intentionally kept
     * for audit.
     */
    async deletePendingByClass(scheduleEntryId: string, manager?: EntityManager): Promise<number> {
        const repo = manager ? manager.getRepository(Reminder) : this.reminderRepo;
        const result = await repo
            .createQueryBuilder()
            .delete()
            .from(Reminder)
            .where('scheduleEntryId = :scheduleEntryId', { scheduleEntryId })
            .andWhere("status = 'pending'")
            .execute();
        return result.affected ?? 0;
    }

    private isUniqueViolation(err: unknown): boolean {
        if (!(err instanceof QueryFailedError)) return false;
        return (err as QueryFailedError & { code?: string }).code === PG_UNIQUE_VIOLATION;
    }
}
