import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { CustomerMembership } from './customer-membership.entity';
import { DATE_ONLY_TRANSFORMER } from './date-only.transformer';

/**
 * Story 7.6 — single-contiguous freeze per membership (MVP). One row per
 * recorded freeze; the membership's `endDate` shift + `freezeDaysRemaining`
 * decrement happen in the same transaction as the insert.
 *
 * CASCADE on membership delete: matches GuestVisit / 7.5 — application
 * blocks customer deletes when memberships exist, so freezes normally
 * outlive their membership.
 */
@Entity('freeze_events')
@Index('idx_freeze_membership', ['customerMembershipId'])
export class FreezeEvent {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    customerMembershipId: string;

    @Column({ type: 'date', transformer: DATE_ONLY_TRANSFORMER })
    startDate: Date;

    @Column({ type: 'date', transformer: DATE_ONLY_TRANSFORMER })
    endDate: Date;

    @Column({ type: 'int' })
    durationDays: number;

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
