import { IOutboxPayload, NotificationOutbox, TOutboxNotificationType, TOutboxStatus } from '@fitcalendar/db';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';

/**
 * Total send attempts per outbox row before giving up.
 * Mirrors the 5.3 reminder dispatcher's MAX_RETRY_ATTEMPTS = 3 but expressed
 * as "max attempts" rather than "max retry count": each attempt increments
 * `attemptCount`, and once it hits this value the row is marked `failed`.
 */
export const OUTBOX_MAX_ATTEMPTS = 4;

/**
 * Backoff between attempts in ms. `RETRY_BACKOFF_MS[N-1]` is the delay after
 * attempt N fails. Length must be `OUTBOX_MAX_ATTEMPTS - 1`; the final attempt
 * has no further backoff because it just marks `failed`.
 *
 * 1 min / 5 min / 30 min — bigger than 5.4's old in-process [1s/5s/30s] because
 * we now schedule across cron ticks. Sub-minute delays would all collapse to
 * "next tick" anyway, so there's no point being shorter.
 */
export const OUTBOX_RETRY_BACKOFF_MS: number[] = [60_000, 5 * 60_000, 30 * 60_000];

export interface IEnqueueInput {
    customerId: string | null;
    type: TOutboxNotificationType;
    payload: IOutboxPayload;
}

@Injectable()
export class NotificationOutboxService {
    private readonly logger = new Logger(NotificationOutboxService.name);

    constructor(
        @InjectRepository(NotificationOutbox)
        private readonly repo: Repository<NotificationOutbox>,
    ) {}

    async enqueue(input: IEnqueueInput): Promise<NotificationOutbox> {
        const row = this.repo.create({
            customerId: input.customerId,
            type: input.type,
            payload: input.payload,
            attemptCount: 0,
            nextAttemptAt: new Date(),
            status: 'pending' as TOutboxStatus,
            lastError: null,
        });
        return this.repo.save(row);
    }

    /**
     * Returns pending rows whose `nextAttemptAt` has passed. Race-safety
     * across replicas is the caller's job (the dispatcher takes a
     * `pg_try_advisory_lock` before calling this, see Commit I).
     */
    findDue(now: Date, batchSize: number): Promise<NotificationOutbox[]> {
        return this.repo.find({
            where: { status: 'pending', nextAttemptAt: LessThanOrEqual(now) },
            order: { nextAttemptAt: 'ASC' },
            take: batchSize,
        });
    }

    async markSent(id: string): Promise<void> {
        await this.repo.update({ id }, { status: 'sent', lastError: null });
    }

    /**
     * Records a failed attempt. After `OUTBOX_MAX_ATTEMPTS` attempts the row
     * is marked `failed` and won't be picked up again. Otherwise `nextAttemptAt`
     * is bumped by the appropriate backoff so the next dispatcher tick that
     * runs after that timestamp re-tries it.
     */
    async recordFailure(id: string, currentAttempt: number, err: unknown): Promise<{ status: TOutboxStatus }> {
        const nextAttempt = currentAttempt + 1;
        const lastError = err instanceof Error ? err.message : String(err);

        if (nextAttempt >= OUTBOX_MAX_ATTEMPTS) {
            await this.repo.update({ id }, { attemptCount: nextAttempt, status: 'failed', lastError });
            return { status: 'failed' };
        }

        // Backoff index: after attempt 1 fails use backoff[0], etc.
        const backoffMs = OUTBOX_RETRY_BACKOFF_MS[currentAttempt];
        const nextAttemptAt = new Date(Date.now() + (backoffMs ?? 0));
        await this.repo.update({ id }, { attemptCount: nextAttempt, nextAttemptAt, lastError });
        return { status: 'pending' };
    }
}
