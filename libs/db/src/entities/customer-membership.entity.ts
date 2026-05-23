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
import { MembershipPlan } from './membership-plan.entity';

export type TMembershipStatus = 'active' | 'expired' | 'cancelled';

/**
 * Story 7.4 — join between Customer and MembershipPlan with state captured
 * at assignment time. `endDate` + counters are snapshots (not derived from
 * the plan on read) so editing the plan template doesn't retroactively
 * shift existing members' expirations or allowances.
 */
@Entity('customer_memberships')
@Index('idx_membership_customer', ['customerId'])
@Index('idx_membership_status', ['status'])
export class CustomerMembership {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    customerId: string;

    @Column({ type: 'uuid' })
    planId: string;

    @Column({ type: 'date' })
    startDate: Date;

    @Column({ type: 'date' })
    endDate: Date;

    @Column({ type: 'int' })
    guestVisitsRemaining: number;

    @Column({ type: 'int' })
    freezeDaysRemaining: number;

    @Column({ type: 'varchar', length: 20, default: 'active' })
    status: TMembershipStatus;

    @Column({ type: 'text', nullable: true })
    notes: string | null;

    @Column({ type: 'uuid', nullable: true })
    createdByAdminId: string | null;

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    updatedAt: Date;

    @ManyToOne(() => Customer, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'customerId' })
    customer: Customer;

    @ManyToOne(() => MembershipPlan)
    @JoinColumn({ name: 'planId' })
    plan: MembershipPlan;
}
