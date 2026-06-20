import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export type TDurationUnit = 'day' | 'week' | 'month';

@Entity('membership_plans')
export class MembershipPlan {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 255 })
    name: string;

    @Column({ type: 'int' })
    durationValue: number;

    @Column({ type: 'varchar', length: 10 })
    durationUnit: TDurationUnit;

    @Column({ type: 'int' })
    priceRub: number;

    @Column({ type: 'text', array: true, default: '{}' })
    features: string[];

    @Column({ type: 'int', default: 0 })
    guestVisitsAllowed: number;

    @Column({ type: 'int', default: 0 })
    freezeDaysAllowed: number;

    @Column({ type: 'boolean', default: true })
    isActive: boolean;

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    updatedAt: Date;
}
