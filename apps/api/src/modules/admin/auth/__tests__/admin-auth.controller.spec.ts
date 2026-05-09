import { AdminUser } from '@fitcalendar/db';
import { UnauthorizedException } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { AdminAuthController } from '../admin-auth.controller';
import { AdminAuthService } from '../admin-auth.service';

// @nestjs/throttler stores @Throttle metadata under "THROTTLER:LIMIT" + name and
// "THROTTLER:TTL" + name. The package's main entry doesn't re-export the constants
// (they live in `dist/throttler.constants`), so we use the literal string keys.
const THROTTLER_LIMIT_DEFAULT_KEY = 'THROTTLER:LIMITdefault';
const THROTTLER_TTL_DEFAULT_KEY = 'THROTTLER:TTLdefault';

describe('AdminAuthController', () => {
    let controller: AdminAuthController;
    let mockAuthService: jest.Mocked<AdminAuthService>;

    const adminFixture: AdminUser = {
        id: 'admin-uuid-1',
        email: 'admin@fitcalendar.ru',
        name: 'Admin',
        passwordHash: '$2b$10$irrelevantforthistest',
        isActive: true,
        lastLoginAt: null,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-01T00:00:00Z'),
    };

    beforeEach(async () => {
        mockAuthService = {
            validateCredentials: jest.fn(),
            signToken: jest.fn(),
            recordLogin: jest.fn(),
        } as unknown as jest.Mocked<AdminAuthService>;

        const module: TestingModule = await Test.createTestingModule({
            controllers: [AdminAuthController],
            providers: [{ provide: AdminAuthService, useValue: mockAuthService }],
        }).compile();

        controller = module.get<AdminAuthController>(AdminAuthController);
    });

    describe('POST /admin/auth/login', () => {
        it('returns 200 with token + admin on happy path and records the login', async () => {
            mockAuthService.validateCredentials.mockResolvedValue(adminFixture);
            mockAuthService.signToken.mockReturnValue('signed.jwt.token');
            mockAuthService.recordLogin.mockResolvedValue(undefined);

            const result = await controller.login({
                email: 'admin@fitcalendar.ru',
                password: 'admin123',
            });

            expect(result).toEqual({
                token: 'signed.jwt.token',
                admin: { id: adminFixture.id, email: adminFixture.email, name: adminFixture.name },
            });
            expect(mockAuthService.validateCredentials).toHaveBeenCalledWith('admin@fitcalendar.ru', 'admin123');
            expect(mockAuthService.recordLogin).toHaveBeenCalledWith(adminFixture.id);
        });

        it('throws UnauthorizedException with the Russian message on wrong creds (no user enumeration)', async () => {
            mockAuthService.validateCredentials.mockResolvedValue(null);

            await expect(controller.login({ email: 'admin@fitcalendar.ru', password: 'wrong' })).rejects.toMatchObject({
                status: 401,
                message: 'Неверный email или пароль',
            });

            expect(mockAuthService.signToken).not.toHaveBeenCalled();
            expect(mockAuthService.recordLogin).not.toHaveBeenCalled();
        });

        it('throws UnauthorizedException for any rejection (instance check)', async () => {
            mockAuthService.validateCredentials.mockResolvedValue(null);

            await expect(controller.login({ email: 'admin@fitcalendar.ru', password: 'wrong' })).rejects.toBeInstanceOf(
                UnauthorizedException,
            );
        });

        // Verifies the @Throttle decorator is wired with the AC11 numbers (5 per 15 min).
        // End-to-end "6th request → 429" enforcement is exercised in the Task 15 manual smoke
        // (the global APP_GUARD = ThrottlerGuard binding from api.module.ts isn't loaded here,
        // and the project doesn't ship supertest, so a true integration test would need a new dep).
        it('login route is rate-limited via @Throttle: 5 attempts per 15 minutes (AC11)', () => {
            const target = Object.getPrototypeOf(controller).login;
            const limit = Reflect.getMetadata(THROTTLER_LIMIT_DEFAULT_KEY, target);
            const ttl = Reflect.getMetadata(THROTTLER_TTL_DEFAULT_KEY, target);

            expect(limit).toBe(5);
            expect(ttl).toBe(900_000);
        });
    });
});
