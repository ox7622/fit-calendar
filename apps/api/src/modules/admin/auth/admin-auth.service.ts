import { AdminUser } from '@fitcalendar/db';
import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';

// Pre-computed bcrypt hash used for timing parity when no admin matches the email.
// bcrypt.compare's cost is dominated by the hash work; running a real compare even
// on the miss path keeps response timing roughly equal between "wrong email" and
// "wrong password," limiting user-enumeration via timing side-channel.
const TIMING_PARITY_HASH = '$2b$10$33m0A904Fee1YMpeWq/tOe8vQ4rppu306AFwr.Rhvzb2eMi1bkXku';

interface IAdminTokenPayload {
    sub: string;
    email: string;
    name: string;
}

@Injectable()
export class AdminAuthService {
    private readonly logger = new Logger(AdminAuthService.name);

    constructor(
        @InjectRepository(AdminUser)
        private readonly adminRepository: Repository<AdminUser>,
        private readonly jwtService: JwtService,
    ) {}

    async validateCredentials(email: string, password: string): Promise<AdminUser | null> {
        const admin = await this.adminRepository.findOne({
            where: { email, isActive: true },
        });

        if (!admin) {
            // Constant-time defense: still run a real bcrypt.compare so the response
            // timing on a missing/inactive email is comparable to a wrong-password attempt.
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
            email: admin.email,
            name: admin.name,
        };
        return this.jwtService.sign(payload);
    }

    async recordLogin(adminUserId: string): Promise<void> {
        await this.adminRepository.update({ id: adminUserId }, { lastLoginAt: new Date() });
    }
}
