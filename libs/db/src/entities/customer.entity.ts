import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, OneToMany } from 'typeorm';

import { Reminder } from './reminder.entity';

@Entity('customers')
export class Customer {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 255 })
    firstName: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    lastName: string | null;

    @Column({ type: 'varchar', length: 20, unique: true })
    phone: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    email: string | null;

    // Telegram identity is optional — admins can pre-create customers before
    // the member ever opens the Mini App. Once a phone match links them, this
    // gets populated.
    @Column({ type: 'bigint', nullable: true, unique: true })
    @Index('idx_customers_telegram_id')
    telegramId: number | null;

    @Column({ type: 'varchar', length: 255, nullable: true })
    telegramUsername: string | null;

    @Column({ type: 'boolean', default: true })
    isActive: boolean;

    @Column({ type: 'text', nullable: true })
    notes: string | null;

    @Column({ type: 'int', default: 30 })
    reminderMinutes: number;

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    updatedAt: Date;

    @OneToMany(() => Reminder, (reminder) => reminder.customer)
    reminders: Reminder[];
}
