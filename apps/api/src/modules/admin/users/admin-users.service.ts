import { AdminInviteToken, AdminUser, type TAdminInviteTokenPurpose } from '@fitcalendar/db';
import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { isEmail } from 'class-validator';
import { DataSource, IsNull, Repository } from 'typeorm';

import { generateUrlSafeToken, sha256Hex } from '../../../common/utils/token-hash';
import { MailService } from '../../mail/mail.service';

import { AdminUserListItemDto } from './dto/admin-user.dto';
import { IssuedTokenResponseDto } from './dto/invite-admin.dto';

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

// Sentinel passwordHash for newly invited rows: a real bcrypt hash over a
// throwaway random value, generated once at module load. validateCredentials'
// isActive=false filter already prevents login, but keeping the column hash-
// shaped (and unguessable) avoids any "looks like an empty row" surprises in
// DB inspection. Replaced by the real hash when the invite token is consumed.
const SENTINEL_HASH = bcrypt.hashSync(generateUrlSafeToken(), 10);

@Injectable()
export class AdminUsersService {
    private readonly logger = new Logger(AdminUsersService.name);

    constructor(
        @InjectRepository(AdminUser) private readonly adminRepo: Repository<AdminUser>,
        @InjectRepository(AdminInviteToken) private readonly tokenRepo: Repository<AdminInviteToken>,
        @InjectDataSource() private readonly dataSource: DataSource,
        private readonly mail: MailService,
        private readonly config: ConfigService,
    ) {}

    async list(): Promise<AdminUserListItemDto[]> {
        const admins = await this.adminRepo.find({ order: { createdAt: 'ASC' } });
        return admins.map((a) => ({
            id: a.id,
            login: a.login,
            name: a.name,
            isActive: a.isActive,
            lastLoginAt: a.lastLoginAt?.toISOString() ?? null,
            createdAt: a.createdAt.toISOString(),
        }));
    }

    async invite(issuerAdminId: string, login: string, name: string): Promise<IssuedTokenResponseDto> {
        const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString();

        const issued = await this.dataSource.transaction(async (manager) => {
            const adminRepo = manager.getRepository(AdminUser);
            const tokenRepo = manager.getRepository(AdminInviteToken);

            const existing = await adminRepo.findOne({ where: { login } });

            let adminUser: AdminUser;
            let action: 'created' | 'reactivated';

            if (existing) {
                if (existing.isActive) {
                    throw new ConflictException('Этот логин уже используется активным админом');
                }
                existing.name = name;
                adminUser = await adminRepo.save(existing);
                action = 'reactivated';
            } else {
                adminUser = await adminRepo.save(
                    adminRepo.create({
                        login,
                        name,
                        passwordHash: SENTINEL_HASH,
                        isActive: false,
                    }),
                );
                action = 'created';
            }

            const plaintext = await this.issueTokenInTx(tokenRepo, adminUser.id, issuerAdminId, 'invite');
            return { plaintext, adminUserId: adminUser.id, action };
        });

        return this.buildIssuedResponse(login, name, issued, expiresAt, 'invite');
    }

    async issueReset(issuerAdminId: string, adminUserId: string): Promise<IssuedTokenResponseDto> {
        const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString();

        const issued = await this.dataSource.transaction(async (manager) => {
            const adminRepo = manager.getRepository(AdminUser);
            const tokenRepo = manager.getRepository(AdminInviteToken);

            const admin = await adminRepo.findOne({ where: { id: adminUserId } });
            if (!admin) {
                throw new NotFoundException('Админ не найден');
            }

            const plaintext = await this.issueTokenInTx(tokenRepo, admin.id, issuerAdminId, 'reset');
            return { plaintext, adminUserId: admin.id, login: admin.login, name: admin.name, action: 'reset' as const };
        });

        return this.buildIssuedResponse(issued.login, issued.name, issued, expiresAt, 'reset');
    }

    async deactivate(issuerAdminId: string, targetId: string): Promise<void> {
        // Self-lockout guard runs before the transaction — no DB work needed to reject it.
        if (issuerAdminId === targetId) {
            throw new ConflictException('Нельзя отключить самого себя');
        }

        await this.dataSource.transaction(async (manager) => {
            const adminRepo = manager.getRepository(AdminUser);
            const tokenRepo = manager.getRepository(AdminInviteToken);

            const target = await adminRepo.findOne({ where: { id: targetId } });
            if (!target) {
                throw new NotFoundException('Админ не найден');
            }
            if (!target.isActive) {
                // Already inactive — idempotent no-op.
                return;
            }

            const activeCount = await adminRepo.count({ where: { isActive: true } });
            if (activeCount <= 1) {
                throw new ConflictException('Нельзя отключить последнего активного администратора');
            }

            await adminRepo.update({ id: targetId }, { isActive: false });
            // Consume outstanding tokens so a still-valid set-password link can't
            // flip isActive back to true and bypass the deactivation.
            await this.invalidateOutstandingTokensInTx(tokenRepo, targetId);
        });
    }

    // Assembles the IssuedTokenResponseDto shared by invite/issueReset: attempts
    // email delivery (best-effort) and folds the emailSent/sentToEmail signal into
    // the response so the caller always gets the plaintext link plus delivery status.
    private async buildIssuedResponse(
        login: string,
        name: string,
        issued: { plaintext: string; adminUserId: string; action: 'created' | 'reactivated' | 'reset' },
        expiresAt: string,
        purpose: TAdminInviteTokenPurpose,
    ): Promise<IssuedTokenResponseDto> {
        const { emailSent, sentToEmail } = await this.deliverLinkEmail(
            login,
            name,
            issued.plaintext,
            expiresAt,
            purpose,
        );
        return {
            token: issued.plaintext,
            adminUserId: issued.adminUserId,
            expiresAt,
            action: issued.action,
            emailSent,
            sentToEmail,
        };
    }

    // Sends the one-time link by email when the login is an email and SMTP is
    // configured. Never throws: a failed/disabled send degrades to emailSent=false
    // and the caller still returns the plaintext link as a manual fallback.
    private async deliverLinkEmail(
        login: string,
        name: string,
        token: string,
        expiresAt: string,
        purpose: TAdminInviteTokenPurpose,
    ): Promise<{ emailSent: boolean; sentToEmail: string | null }> {
        if (!isEmail(login) || !this.mail.isEnabled()) {
            return { emailSent: false, sentToEmail: null };
        }
        const url = this.buildSetPasswordUrl(token);
        if (!url) {
            this.logger.warn('ADMIN_APP_URL is unset — cannot build set-password URL; skipping email');
            return { emailSent: false, sentToEmail: null };
        }
        try {
            await this.mail.sendAdminSetPasswordLink({ to: login, name, url, expiresAt, purpose });
            return { emailSent: true, sentToEmail: login };
        } catch (err) {
            this.logger.warn(`Failed to send admin ${purpose} email to ${login}: ${String(err)}`);
            return { emailSent: false, sentToEmail: null };
        }
    }

    private buildSetPasswordUrl(token: string): string | null {
        const base = this.config.get<string>('ADMIN_APP_URL');
        if (!base) {
            return null;
        }
        return `${base.replace(/\/+$/, '')}/set-password?token=${encodeURIComponent(token)}`;
    }

    // Marks every unconsumed token for this admin as consumed. Shared by token
    // issuance (an older forwarded link can't be raced against a fresh one) and
    // deactivation (a still-valid link can't re-activate a disabled account).
    private async invalidateOutstandingTokensInTx(
        tokenRepo: Repository<AdminInviteToken>,
        adminUserId: string,
    ): Promise<void> {
        await tokenRepo.update({ adminUserId, consumedAt: IsNull() }, { consumedAt: new Date() });
    }

    private async issueTokenInTx(
        tokenRepo: Repository<AdminInviteToken>,
        adminUserId: string,
        issuerAdminId: string,
        purpose: TAdminInviteTokenPurpose,
    ): Promise<string> {
        await this.invalidateOutstandingTokensInTx(tokenRepo, adminUserId);

        const plaintext = generateUrlSafeToken();
        await tokenRepo.save(
            tokenRepo.create({
                adminUserId,
                tokenHash: sha256Hex(plaintext),
                purpose,
                expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
                consumedAt: null,
                issuedByAdminId: issuerAdminId,
            }),
        );
        return plaintext;
    }
}
