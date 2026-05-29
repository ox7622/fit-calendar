import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Append-only trail of destructive admin actions (deletes, cancels). Lives
 * outside the transactional path of the action itself — the action commits
 * first, then we best-effort record. A failed audit write logs an error but
 * never blocks or rolls back the user-visible operation; without that rule,
 * a bug in audit-write would cause real customer-facing failures.
 *
 * `adminUserId` is FK with ON DELETE SET NULL so deleting an admin doesn't
 * lose history. `metadata` carries an opaque JSON snapshot of the deleted
 * resource for forensics.
 */
export type AdminAuditAction =
    | 'delete_customer'
    | 'delete_plan'
    | 'cancel_schedule_entry'
    | 'delete_schedule_entry'
    | 'delete_coach'
    | 'delete_training_type'
    | 'delete_guest_visit'
    | 'delete_freeze_event';

@Entity('admin_audit_log')
@Index('idx_admin_audit_admin_created', ['adminUserId', 'createdAt'])
@Index('idx_admin_audit_resource', ['resourceType', 'resourceId'])
export class AdminAuditLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid', nullable: true })
    adminUserId: string | null;

    @Column({ type: 'text' })
    action: AdminAuditAction;

    @Column({ type: 'text' })
    resourceType: string;

    @Column({ type: 'text' })
    resourceId: string;

    @Column({ type: 'jsonb', nullable: true })
    metadata: Record<string, unknown> | null;

    @Column({ type: 'inet', nullable: true })
    ipAddress: string | null;

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt: Date;
}
