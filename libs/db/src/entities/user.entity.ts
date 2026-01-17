import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, OneToMany } from 'typeorm';

import { Reminder } from './reminder.entity';

@Entity('users')
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'bigint', unique: true })
    @Index('idx_users_telegram_id')
    telegramId: number;

    @Column({ type: 'varchar', length: 255 })
    firstName: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    lastName: string | null;

    @Column({ type: 'varchar', length: 255, nullable: true })
    username: string | null;

    @Column({ type: 'int', default: 30 })
    reminderMinutes: number;

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    updatedAt: Date;

    @OneToMany(() => Reminder, (reminder) => reminder.user)
    reminders: Reminder[];
}
