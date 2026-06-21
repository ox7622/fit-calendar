import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type TBotSubscriberSource = 'bot' | 'mini_app';

/**
 * Everyone who has contacted the bot (/start, any message) or opened the Mini App.
 * The broadcast audience for schedule-change notifications — separate from `customers`
 * because a subscriber need not be a customer (and `customers.phone` is NOT NULL UNIQUE,
 * so a bot-only contact can't live there).
 */
@Entity('bot_subscribers')
export class BotSubscriber {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    // bigint maps to string in JS; the service Number()s it on read (same as customers.telegramId).
    @Column({ type: 'bigint', unique: true })
    telegramId: number;

    @Column({ type: 'varchar', length: 255, nullable: true })
    firstName: string | null;

    @Column({ type: 'varchar', length: 255, nullable: true })
    username: string | null;

    /** Most recent channel the contact was seen on. */
    @Column({ type: 'text' })
    source: TBotSubscriberSource;

    @Index('idx_bot_subscribers_active')
    @Column({ type: 'boolean', default: true })
    isActive: boolean;

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    updatedAt: Date;
}
