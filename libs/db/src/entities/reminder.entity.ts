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

import { ScheduleEntry } from './schedule-entry.entity';
import { User } from './user.entity';

export type TReminderStatus = 'pending' | 'sent' | 'failed';

@Entity('reminders')
@Unique(['userId', 'scheduleEntryId'])
@Index('idx_reminders_user', ['userId'])
export class Reminder {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    userId: string;

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

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt: Date;

    @ManyToOne(() => User, (user) => user.reminders, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user: User;

    @ManyToOne(() => ScheduleEntry, (entry) => entry.reminders, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'scheduleEntryId' })
    scheduleEntry: ScheduleEntry;
}
