import { AdminInviteToken, AdminUser } from '@fitcalendar/db';
import { GoneException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { DataSource, IsNull, MoreThan, Repository } from 'typeorm';

import { sha256Hex } from '../../../common/utils/token-hash';

import { InviteTokenInfoDto } from './dto/set-password.dto';

// Pre-computed bcrypt hash used for timing parity when no admin matches the login.
// bcrypt.compare's cost is dominated by the hash work; running a real compare even
// on the miss path keeps response timing roughly equal between "wrong login" and
// "wrong password," limiting user-enumeration via timing side-channel.
const TIMING_PARITY_HASH = '$2b$10$33m0A904Fee1YMpeWq/tOe8vQ4rppu306AFwr.Rhvzb2eMi1bkXku';

const BCRYPT_COST = 10;

interface IAdminTokenPayload {
    sub: string;
    login: string;
    name: string;
}

@Injectable()
export class AdminAuthService {
    private readonly logger = new Logger(AdminAuthService.name);

    constructor(
        @InjectRepository(AdminUser)
        private readonly adminRepository: Repository<AdminUser>,
        @InjectRepository(AdminInviteToken)
        private readonly tokenRepository: Repository<AdminInviteToken>,
        @InjectDataSource() private readonly dataSource: DataSource,
        private readonly jwtService: JwtService,
    ) {}

    async validateCredentials(login: string, password: string): Promise<AdminUser | null> {
        const admin = await this.adminRepository.findOne({
            where: { login, isActive: true },
        });

        if (!admin) {
            // Constant-time defense: still run a real bcrypt.compare so the response
            // timing on a missing/inactive login is comparable to a wrong-password attempt.
            await bcrypt.compare(password, TIMING_PARITY_HASH);
            return null;
        }

        const passwordMatches = await bcrypt.compare(password, admin.passwordHash);
        if (!passwordMatches) {
            return null;
        }

        return admin;
    }

    signToken(admin: AdminUser): string {
        const payload: IAdminTokenPayload = {
            sub: admin.id,
            login: admin.login,
            name: admin.name,
        };
        return this.jwtService.sign(payload);
    }

    async recordLogin(adminUserId: string): Promise<void> {
        await this.adminRepository.update({ id: adminUserId }, { lastLoginAt: new Date() });
    }

    async getInviteTokenInfo(plaintextToken: string): Promise<InviteTokenInfoDto> {
        // Single query that joins admin via the FK relation. ON DELETE CASCADE on the
        // FK means the admin row is guaranteed present whenever the token row is.
        const token = await this.tokenRepository.findOne({
            where: {
                tokenHash: sha256Hex(plaintextToken),
                consumedAt: IsNull(),
                expiresAt: MoreThan(new Date()),
            },
            relations: { adminUser: true },
        });
        if (!token || !token.adminUser) {
            // 404 covers all of: unknown / expired / already consumed. Don't leak
            // which one — same reason login returns a single generic 401.
            throw new NotFoundException('Ссылка недействительна или истекла');
        }
        return { login: token.adminUser.login, name: token.adminUser.name, purpose: token.purpose };
    }

    async setPasswordWithToken(plaintextToken: string, newPassword: string): Promise<void> {
        // Hash before the transaction so the ~80ms bcrypt cost doesn't hold row
        // locks on admin_invite_tokens / admin_users.
        const passwordHash = await bcrypt.hash(newPassword, BCRYPT_COST);

        await this.dataSource.transaction(async (manager) => {
            const tokenRepo = manager.getRepository(AdminInviteToken);
            const adminRepo = manager.getRepository(AdminUser);

            const token = await tokenRepo.findOne({
                where: { tokenHash: sha256Hex(plaintextToken) },
            });
            if (!token) {
                throw new NotFoundException('Ссылка недействительна');
            }
            if (token.consumedAt || token.expiresAt.getTime() <= Date.now()) {
                // Differentiated 410 vs 404 leaks "this token existed once" — but
                // since the issuer already saw the link, that's not a secret. 410
                // is the more accurate signal to the client.
                throw new GoneException('Ссылка уже использована или истекла');
            }

            await adminRepo.update({ id: token.adminUserId }, { passwordHash, isActive: true });
            await tokenRepo.update({ id: token.id }, { consumedAt: new Date() });
        });
    }
}
