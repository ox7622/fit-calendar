import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { CustomerMembership } from './customer-membership.entity';

/**
 * Story 7.5 — audit trail row for each guest visit a member uses on their
 * plan. Insert + decrement of `customerMembership.guestVisitsRemaining`
 * happen in a single transaction so the counter and the audit trail can't
 * disagree. `CASCADE` on membership delete is defensive — the application
 * blocks customer deletes when memberships exist (Story 7.2), so visits
 * normally outlive their membership.
 */
@Entity('guest_visits')
@Index('idx_guest_visit_membership', ['customerMembershipId'])
export class GuestVisit {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    customerMembershipId: string;

    @Column({ type: 'timestamptz' })
    visitedAt: Date;

    @Column({ type: 'text', nullable: true })
    notes: string | null;

    @Column({ type: 'uuid' })
    recordedByAdminId: string;

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt: Date;

    @ManyToOne(() => CustomerMembership, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'customerMembershipId' })
    customerMembership: CustomerMembership;
}
