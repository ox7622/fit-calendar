import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { AdminUser } from './admin-user.entity';

export type TAdminInviteTokenPurpose = 'invite' | 'reset';

/**
 * One-time tokens that back both new-admin invites and peer-issued password
 * resets. Only the sha256 of the plaintext is stored; the plaintext is shown
 * to the issuing admin exactly once and forwarded out-of-band. Consumed and
 * expired tokens are kept for forensics — they're invalidated by the
 * `consumedAt`/`expiresAt` columns, not by deletion.
 */
@Entity('admin_invite_tokens')
@Index('idx_admin_invite_token_hash', ['tokenHash'], { unique: true })
@Index('idx_admin_invite_open_per_admin', ['adminUserId'], { where: '"consumedAt" IS NULL' })
export class AdminInviteToken {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    adminUserId: string;

    @ManyToOne(() => AdminUser, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'adminUserId' })
    adminUser?: AdminUser;

    @Column({ type: 'varchar', length: 64 })
    tokenHash: string;

    @Column({ type: 'varchar', length: 16 })
    purpose: TAdminInviteTokenPurpose;

    @Column({ type: 'timestamptz' })
    expiresAt: Date;

    @Column({ type: 'timestamptz', nullable: true })
    consumedAt: Date | null;

    @Column({ type: 'uuid', nullable: true })
    issuedByAdminId: string | null;

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt: Date;
}
