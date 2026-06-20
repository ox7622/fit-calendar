import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    Index,
    Unique,
    JoinColumn,
} from 'typeorm';

import { Customer } from './customer.entity';
import { ScheduleEntry } from './schedule-entry.entity';

export type TReminderStatus = 'pending' | 'sent' | 'failed';

@Entity('reminders')
@Unique(['customerId', 'scheduleEntryId'])
@Index('idx_reminders_customer', ['customerId'])
export class Reminder {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    customerId: string;

    @Column({ type: 'uuid' })
    scheduleEntryId: string;

    @Column({ type: 'timestamptz' })
    @Index('idx_reminders_notify_at')
    notifyAt: Date;

    @Column({
        type: 'varchar',
        length: 20,
        default: 'pending',
    })
    status: TReminderStatus;

    @Column({ type: 'timestamptz', nullable: true })
    sentAt: Date | null;

    /**
     * Number of delivery attempts so far. Story 5.3 retries up to 3 times
     * total (1 initial + 2 retries on subsequent cron ticks); after that
     * the dispatcher transitions `status` to `'failed'` and stops retrying.
     */
    @Column({ type: 'int', default: 0 })
    retryCount: number;

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt: Date;

    @ManyToOne(() => Customer, (customer) => customer.reminders, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'customerId' })
    customer: Customer;

    @ManyToOne(() => ScheduleEntry, (entry) => entry.reminders, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'scheduleEntryId' })
    scheduleEntry: ScheduleEntry;
}
