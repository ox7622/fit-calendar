import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

import { BIGINT_NUMBER_TRANSFORMER } from './bigint-number.transformer';

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

    @Column({ type: 'bigint', unique: true, transformer: BIGINT_NUMBER_TRANSFORMER })
    telegramId: number;

    @Column({ type: 'varchar', length: 255, nullable: true })
    firstName: string | null;

    @Column({ type: 'boolean', default: true })
    isActive: boolean;

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    updatedAt: Date;
}
