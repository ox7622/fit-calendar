import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/**
 * Admin-managed allowed durations (minutes) for schedule entries. Replaces the
 * old hardcoded `[30, 45, 60, 90]` list — the schedule form now offers whatever
 * is here; the API only enforces a sanity range (Min/Max) since edits are
 * admin-only.
 */
@Entity('duration_options')
@Index('idx_duration_options_value', ['valueMinutes'], { unique: true })
export class DurationOption {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'int' })
    valueMinutes: number;

    @Column({ type: 'int', default: 0 })
    sortOrder: number;

    @Column({ type: 'boolean', default: true })
    isActive: boolean;

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    updatedAt: Date;
}
