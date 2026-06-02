import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

import { Customer } from './customer.entity';

/**
 * Story 5.4/5.5 follow-up — persisted outbox for out-of-band notifications
 * (class change / class cancelled). Replaces the in-process `withRetry`
 * helper that lost state on API restart: if a row is `pending`, it survives
 * a restart and gets retried on the next dispatcher tick.
 *
 * Rows are append-only from the listeners; the dispatcher mutates `status`,
 * `attemptCount`, `nextAttemptAt`, `lastError` as it processes them. We don't
 * delete `sent` or `failed` rows — they're a small audit trail. A future
 * housekeeping cron can purge old rows once volume justifies it.
 */
export type TOutboxNotificationType = 'schedule_changed' | 'schedule_cancelled';
export type TOutboxStatus = 'pending' | 'sent' | 'failed';

export interface IOutboxPayload {
    telegramId: number;
    text: string;
    /** Optional Mini-App URL for the inline "📅 Открыть" button. */
    webAppUrl?: string;
    /** Carried for logging + forensics, not used by the dispatcher's send call. */
    scheduleEntryId?: string;
}

@Entity('notification_outbox')
// Single composite index covers the dispatcher's claim query
// (status = 'pending' AND nextAttemptAt <= now ORDER BY nextAttemptAt).
@Index('idx_outbox_due', ['status', 'nextAttemptAt'])
@Index('idx_outbox_customer', ['customerId'])
export class NotificationOutbox {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid', nullable: true })
    customerId: string | null;

    @ManyToOne(() => Customer, { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'customerId' })
    customer: Customer | null;

    @Column({ type: 'text' })
    type: TOutboxNotificationType;

    @Column({ type: 'jsonb' })
    payload: IOutboxPayload;

    @Column({ type: 'int', default: 0 })
    attemptCount: number;

    @Column({ type: 'timestamptz' })
    nextAttemptAt: Date;

    @Column({ type: 'text', default: 'pending' })
    status: TOutboxStatus;

    @Column({ type: 'text', nullable: true })
    lastError: string | null;

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    updatedAt: Date;
}
