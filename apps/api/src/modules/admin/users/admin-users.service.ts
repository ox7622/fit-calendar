import { AdminInviteToken, AdminUser, type TAdminInviteTokenPurpose } from '@fitcalendar/db';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { DataSource, IsNull, Repository } from 'typeorm';

import { generateUrlSafeToken, sha256Hex } from '../../../common/utils/token-hash';

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
    constructor(
        @InjectRepository(AdminUser) private readonly adminRepo: Repository<AdminUser>,
        @InjectRepository(AdminInviteToken) private readonly tokenRepo: Repository<AdminInviteToken>,
        @InjectDataSource() private readonly dataSource: DataSource,
    ) {}

    async list(): Promise<AdminUserListItemDto[]> {
        const admins = await this.adminRepo.find({ order: { createdAt: 'ASC' } });
        return admins.map((a) => ({
            id: a.id,
            email: a.email,
            name: a.name,
            isActive: a.isActive,
            lastLoginAt: a.lastLoginAt?.toISOString() ?? null,
            createdAt: a.createdAt.toISOString(),
        }));
    }

    async invite(issuerAdminId: string, email: string, name: string): Promise<IssuedTokenResponseDto> {
        return this.dataSource.transaction(async (manager) => {
            const adminRepo = manager.getRepository(AdminUser);
            const tokenRepo = manager.getRepository(AdminInviteToken);

            const existing = await adminRepo.findOne({ where: { email } });

            let adminUser: AdminUser;
            let action: 'created' | 'reactivated';

            if (existing) {
                if (existing.isActive) {
                    throw new ConflictException('Этот email уже используется активным админом');
                }
                existing.name = name;
                adminUser = await adminRepo.save(existing);
                action = 'reactivated';
            } else {
                adminUser = await adminRepo.save(
                    adminRepo.create({
                        email,
                        name,
                        passwordHash: SENTINEL_HASH,
                        isActive: false,
                    }),
                );
                action = 'created';
            }

            const plaintext = await this.issueTokenInTx(tokenRepo, adminUser.id, issuerAdminId, 'invite');

            return {
                token: plaintext,
                adminUserId: adminUser.id,
                expiresAt: new Date(Date.now() + TOKEN_TTL_MS).toISOString(),
                action,
            };
        });
    }

    async issueReset(issuerAdminId: string, adminUserId: string): Promise<IssuedTokenResponseDto> {
        return this.dataSource.transaction(async (manager) => {
            const adminRepo = manager.getRepository(AdminUser);
            const tokenRepo = manager.getRepository(AdminInviteToken);

            const admin = await adminRepo.findOne({ where: { id: adminUserId } });
            if (!admin) {
                throw new NotFoundException('Админ не найден');
            }

            const plaintext = await this.issueTokenInTx(tokenRepo, admin.id, issuerAdminId, 'reset');

            return {
                token: plaintext,
                adminUserId: admin.id,
                expiresAt: new Date(Date.now() + TOKEN_TTL_MS).toISOString(),
                action: 'reset',
            };
        });
    }

    private async issueTokenInTx(
        tokenRepo: Repository<AdminInviteToken>,
        adminUserId: string,
        issuerAdminId: string,
        purpose: TAdminInviteTokenPurpose,
    ): Promise<string> {
        // Invalidate any prior unconsumed tokens for this admin so an older
        // forwarded link can't be raced against the freshly issued one.
        await tokenRepo.update({ adminUserId, consumedAt: IsNull() }, { consumedAt: new Date() });

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
