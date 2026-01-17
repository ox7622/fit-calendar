import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    OneToMany,
    Index,
    JoinColumn,
} from 'typeorm';

import { Coach } from './coach.entity';
import { Reminder } from './reminder.entity';
import { TrainingType } from './training-type.entity';

export type TScheduleStatus = 'scheduled' | 'cancelled';

@Entity('schedule_entries')
@Index('idx_schedule_start_time', ['startTime'])
@Index('idx_schedule_status', ['status'])
export class ScheduleEntry {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    @Index('idx_schedule_type')
    trainingTypeId: string;

    @Column({ type: 'uuid' })
    @Index('idx_schedule_coach')
    coachId: string;

    @Column({ type: 'timestamptz' })
    startTime: Date;

    @Column({ type: 'int' })
    durationMinutes: number;

    @Column({
        type: 'varchar',
        length: 20,
        default: 'scheduled',
    })
    status: TScheduleStatus;

    @Column({ type: 'text', nullable: true })
    cancellationReason: string | null;

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    updatedAt: Date;

    @ManyToOne(() => TrainingType, (trainingType) => trainingType.scheduleEntries)
    @JoinColumn({ name: 'trainingTypeId' })
    trainingType: TrainingType;

    @ManyToOne(() => Coach, (coach) => coach.scheduleEntries)
    @JoinColumn({ name: 'coachId' })
    coach: Coach;

    @OneToMany(() => Reminder, (reminder) => reminder.scheduleEntry)
    reminders: Reminder[];
}
