import { Reminder, ScheduleEntry } from '@fitcalendar/db';
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { subMinutes } from 'date-fns';
import { QueryFailedError, Repository } from 'typeorm';

import { ReminderResponseDto, toReminderResponse } from './dto/reminder-response.dto';

const PG_UNIQUE_VIOLATION = '23505';

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

    private isUniqueViolation(err: unknown): boolean {
        if (!(err instanceof QueryFailedError)) return false;
        return (err as QueryFailedError & { code?: string }).code === PG_UNIQUE_VIOLATION;
    }
}
