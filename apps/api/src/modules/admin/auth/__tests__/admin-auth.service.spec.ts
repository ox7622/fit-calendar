import { createHash } from 'crypto';

import { AdminInviteToken, AdminUser } from '@fitcalendar/db';
import { GoneException, NotFoundException } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import type * as Bcrypt from 'bcrypt';
import type { DataSource, EntityManager, Repository } from 'typeorm';

import { AdminAuthService } from '../admin-auth.service';

// bcrypt 6.x exports non-configurable properties, so jest.spyOn fails with
// "Cannot redefine property: compare". Wrap the real implementations in
// jest.fn so we can assert on call counts while keeping real hashing/compare
// behaviour for the rest of the suite.
jest.mock('bcrypt', () => {
    const real = jest.requireActual<typeof Bcrypt>('bcrypt');
    return {
        __esModule: true,
        compare: jest.fn(real.compare),
        hash: jest.fn(real.hash),
    };
});

const TEST_JWT_SECRET = 'test-secret-min-32-characters-long-aaaaa';

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

describe('AdminAuthService', () => {
    let service: AdminAuthService;
    let jwtService: JwtService;
    let mockRepository: jest.Mocked<Repository<AdminUser>>;
    let mockTokenRepo: jest.Mocked<Repository<AdminInviteToken>>;
    let txAdminRepo: jest.Mocked<Repository<AdminUser>>;
    let txTokenRepo: jest.Mocked<Repository<AdminInviteToken>>;
    let mockDataSource: jest.Mocked<Pick<DataSource, 'transaction'>>;

    const passwordPlain = 'admin123';
    let passwordHash: string;

    const buildMockAdmin = (overrides: Partial<AdminUser> = {}): AdminUser => ({
        id: 'admin-uuid-1',
        login: 'admin',
        name: 'Admin',
        passwordHash,
        isActive: true,
        lastLoginAt: null,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-01T00:00:00Z'),
        ...overrides,
    });

    const buildMockToken = (overrides: Partial<AdminInviteToken> = {}): AdminInviteToken => ({
        id: 'token-uuid-1',
        adminUserId: 'admin-uuid-1',
        adminUser: undefined,
        tokenHash: sha256('plaintext-token'),
        purpose: 'invite',
        expiresAt: new Date(Date.now() + 60_000),
        consumedAt: null,
        issuedByAdminId: 'issuer-uuid',
        createdAt: new Date('2026-01-01T00:00:00Z'),
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
        mockTokenRepo = {
            findOne: jest.fn(),
            update: jest.fn(),
        } as unknown as jest.Mocked<Repository<AdminInviteToken>>;
        txAdminRepo = {
            update: jest.fn(),
        } as unknown as jest.Mocked<Repository<AdminUser>>;
        txTokenRepo = {
            findOne: jest.fn(),
            update: jest.fn(),
        } as unknown as jest.Mocked<Repository<AdminInviteToken>>;
        const txManager = {
            getRepository: jest.fn((entity) => {
                if (entity === AdminUser) return txAdminRepo;
                if (entity === AdminInviteToken) return txTokenRepo;
                throw new Error(`Unexpected getRepository call: ${String(entity)}`);
            }),
        } as unknown as EntityManager;
        mockDataSource = {
            transaction: jest.fn(async (cb: (m: EntityManager) => Promise<unknown>) => cb(txManager)),
        } as unknown as jest.Mocked<Pick<DataSource, 'transaction'>>;

        const module: TestingModule = await Test.createTestingModule({
            imports: [JwtModule.register({ secret: TEST_JWT_SECRET, signOptions: { expiresIn: '24h' } })],
            providers: [
                AdminAuthService,
                { provide: getRepositoryToken(AdminUser), useValue: mockRepository },
                { provide: getRepositoryToken(AdminInviteToken), useValue: mockTokenRepo },
                { provide: getDataSourceToken(), useValue: mockDataSource },
            ],
        }).compile();

        service = module.get<AdminAuthService>(AdminAuthService);
        jwtService = module.get<JwtService>(JwtService);
    });

    describe('validateCredentials', () => {
        it('returns the admin on happy path (active + correct password)', async () => {
            const admin = buildMockAdmin();
            mockRepository.findOne.mockResolvedValue(admin);

            const result = await service.validateCredentials(admin.login, passwordPlain);

            expect(result).toEqual(admin);
            expect(mockRepository.findOne).toHaveBeenCalledWith({
                where: { login: admin.login, isActive: true },
            });
        });

        it('returns null when password is wrong', async () => {
            mockRepository.findOne.mockResolvedValue(buildMockAdmin());

            const result = await service.validateCredentials('admin', 'wrong-password');

            expect(result).toBeNull();
        });

        it('returns null when admin is inactive (findOne misses by where clause)', async () => {
            mockRepository.findOne.mockResolvedValue(null);

            const result = await service.validateCredentials('inactive@fitcalendar.ru', passwordPlain);

            expect(result).toBeNull();
        });

        it('returns null when login does not exist AND still runs bcrypt.compare (timing parity)', async () => {
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
        it('produces a JWT verifiable with the same secret with sub/login/name claims', () => {
            const admin = buildMockAdmin();

            const token = service.signToken(admin);

            const decoded = jwtService.verify<{ sub: string; login: string; name: string }>(token, {
                secret: TEST_JWT_SECRET,
            });
            expect(decoded.sub).toBe(admin.id);
            expect(decoded.login).toBe(admin.login);
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

    describe('getInviteTokenInfo', () => {
        it('returns login/name/purpose from the joined adminUser relation', async () => {
            mockTokenRepo.findOne.mockResolvedValue(buildMockToken({ purpose: 'reset', adminUser: buildMockAdmin() }));

            const info = await service.getInviteTokenInfo('plaintext-token');

            expect(info).toEqual({ login: 'admin', name: 'Admin', purpose: 'reset' });
            const call = mockTokenRepo.findOne.mock.calls[0][0];
            expect((call?.where as { tokenHash: string }).tokenHash).toBe(sha256('plaintext-token'));
            expect(call?.relations).toEqual({ adminUser: true });
        });

        it('throws NotFound for unknown / expired / consumed tokens (no leakage)', async () => {
            mockTokenRepo.findOne.mockResolvedValue(null);

            await expect(service.getInviteTokenInfo('whatever')).rejects.toBeInstanceOf(NotFoundException);
        });
    });

    describe('setPasswordWithToken', () => {
        it('updates passwordHash + isActive=true and marks the token consumed', async () => {
            const token = buildMockToken();
            txTokenRepo.findOne.mockResolvedValue(token);

            await service.setPasswordWithToken('plaintext-token', 'newPass123');

            expect(txAdminRepo.update).toHaveBeenCalledTimes(1);
            const [adminWhere, adminPatch] = txAdminRepo.update.mock.calls[0];
            expect(adminWhere).toEqual({ id: token.adminUserId });
            expect(adminPatch).toEqual(expect.objectContaining({ isActive: true }));
            expect((adminPatch as { passwordHash: string }).passwordHash).toMatch(/^\$2[aby]\$/);

            expect(txTokenRepo.update).toHaveBeenCalledTimes(1);
            const [tokenWhere, tokenPatch] = txTokenRepo.update.mock.calls[0];
            expect(tokenWhere).toEqual({ id: token.id });
            expect(tokenPatch).toEqual(expect.objectContaining({ consumedAt: expect.any(Date) }));
        });

        it('throws 404 NotFound when the token has never existed', async () => {
            txTokenRepo.findOne.mockResolvedValue(null);

            await expect(service.setPasswordWithToken('nope', 'newPass123')).rejects.toBeInstanceOf(NotFoundException);
        });

        it('throws 410 Gone on replay (already consumed)', async () => {
            txTokenRepo.findOne.mockResolvedValue(buildMockToken({ consumedAt: new Date() }));

            await expect(service.setPasswordWithToken('plaintext-token', 'newPass123')).rejects.toBeInstanceOf(
                GoneException,
            );
        });

        it('throws 410 Gone on expired token', async () => {
            txTokenRepo.findOne.mockResolvedValue(buildMockToken({ expiresAt: new Date(Date.now() - 1) }));

            await expect(service.setPasswordWithToken('plaintext-token', 'newPass123')).rejects.toBeInstanceOf(
                GoneException,
            );
        });
    });
});
