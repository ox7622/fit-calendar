import { AdminUser } from '@fitcalendar/db';
import { JwtModule, JwtService } from '@nestjs/jwt';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import type { Repository } from 'typeorm';

import { AdminAuthService } from '../admin-auth.service';

// bcrypt 6.x exports non-configurable properties, so jest.spyOn fails with
// "Cannot redefine property: compare". Wrap the real implementations in
// jest.fn so we can assert on call counts while keeping real hashing/compare
// behaviour for the rest of the suite.
jest.mock('bcrypt', () => {
    const real = jest.requireActual<typeof import('bcrypt')>('bcrypt');
    return {
        __esModule: true,
        compare: jest.fn(real.compare),
        hash: jest.fn(real.hash),
    };
});

const TEST_JWT_SECRET = 'test-secret-min-32-characters-long-aaaaa';

describe('AdminAuthService', () => {
    let service: AdminAuthService;
    let jwtService: JwtService;
    let mockRepository: jest.Mocked<Repository<AdminUser>>;

    const passwordPlain = 'admin123';
    let passwordHash: string;

    const buildMockAdmin = (overrides: Partial<AdminUser> = {}): AdminUser => ({
        id: 'admin-uuid-1',
        email: 'admin@fitcalendar.ru',
        name: 'Admin',
        passwordHash,
        isActive: true,
        lastLoginAt: null,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-01T00:00:00Z'),
        ...overrides,
    });

    beforeAll(async () => {
        passwordHash = await bcrypt.hash(passwordPlain, 10);
    });

    beforeEach(async () => {
        mockRepository = {
            findOne: jest.fn(),
            update: jest.fn(),
        } as unknown as jest.Mocked<Repository<AdminUser>>;

        const module: TestingModule = await Test.createTestingModule({
            imports: [JwtModule.register({ secret: TEST_JWT_SECRET, signOptions: { expiresIn: '24h' } })],
            providers: [
                AdminAuthService,
                {
                    provide: getRepositoryToken(AdminUser),
                    useValue: mockRepository,
                },
            ],
        }).compile();

        service = module.get<AdminAuthService>(AdminAuthService);
        jwtService = module.get<JwtService>(JwtService);
    });

    describe('validateCredentials', () => {
        it('returns the admin on happy path (active + correct password)', async () => {
            const admin = buildMockAdmin();
            mockRepository.findOne.mockResolvedValue(admin);

            const result = await service.validateCredentials(admin.email, passwordPlain);

            expect(result).toEqual(admin);
            expect(mockRepository.findOne).toHaveBeenCalledWith({
                where: { email: admin.email, isActive: true },
            });
        });

        it('returns null when password is wrong', async () => {
            mockRepository.findOne.mockResolvedValue(buildMockAdmin());

            const result = await service.validateCredentials('admin@fitcalendar.ru', 'wrong-password');

            expect(result).toBeNull();
        });

        it('returns null when admin is inactive (findOne misses by where clause)', async () => {
            mockRepository.findOne.mockResolvedValue(null);

            const result = await service.validateCredentials('inactive@fitcalendar.ru', passwordPlain);

            expect(result).toBeNull();
        });

        it('returns null when email does not exist AND still runs bcrypt.compare (timing parity)', async () => {
            mockRepository.findOne.mockResolvedValue(null);
            const compareMock = bcrypt.compare as jest.Mock;
            compareMock.mockClear();

            const result = await service.validateCredentials('does-not-exist@fitcalendar.ru', passwordPlain);

            expect(result).toBeNull();
            expect(compareMock).toHaveBeenCalledTimes(1);
            const [, hashCalledWith] = compareMock.mock.calls[0];
            expect(typeof hashCalledWith).toBe('string');
            expect(hashCalledWith).toMatch(/^\$2[aby]\$/); // a real bcrypt hash, not an empty string
        });
    });

    describe('signToken', () => {
        it('produces a JWT verifiable with the same secret with sub/email/name claims', () => {
            const admin = buildMockAdmin();

            const token = service.signToken(admin);

            const decoded = jwtService.verify<{ sub: string; email: string; name: string }>(token, {
                secret: TEST_JWT_SECRET,
            });
            expect(decoded.sub).toBe(admin.id);
            expect(decoded.email).toBe(admin.email);
            expect(decoded.name).toBe(admin.name);
        });
    });

    describe('recordLogin', () => {
        it('updates lastLoginAt for the admin id', async () => {
            mockRepository.update.mockResolvedValue({ affected: 1, raw: [], generatedMaps: [] });

            await service.recordLogin('admin-uuid-1');

            expect(mockRepository.update).toHaveBeenCalledTimes(1);
            const [where, patch] = mockRepository.update.mock.calls[0];
            expect(where).toEqual({ id: 'admin-uuid-1' });
            expect(patch).toEqual(expect.objectContaining({ lastLoginAt: expect.any(Date) }));
        });
    });
});
