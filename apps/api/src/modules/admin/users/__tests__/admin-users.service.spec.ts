import { AdminInviteToken, AdminUser } from '@fitcalendar/db';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { IsNull } from 'typeorm';
import type { DataSource, EntityManager, Repository } from 'typeorm';

import { MailService } from '../../../mail/mail.service';
import { AdminUsersService } from '../admin-users.service';

describe('AdminUsersService', () => {
    let service: AdminUsersService;
    let adminRepo: jest.Mocked<Repository<AdminUser>>;
    let tokenRepo: jest.Mocked<Repository<AdminInviteToken>>;
    let txAdminRepo: jest.Mocked<Repository<AdminUser>>;
    let txTokenRepo: jest.Mocked<Repository<AdminInviteToken>>;
    let dataSource: jest.Mocked<Pick<DataSource, 'transaction'>>;
    let mailService: { isEnabled: jest.Mock; sendAdminSetPasswordLink: jest.Mock };
    let configService: { get: jest.Mock };

    const buildAdmin = (overrides: Partial<AdminUser> = {}): AdminUser => ({
        id: 'admin-1',
        login: 'a',
        name: 'A',
        passwordHash: '$2b$10$abc',
        isActive: true,
        lastLoginAt: null,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-01T00:00:00Z'),
        ...overrides,
    });

    beforeEach(async () => {
        adminRepo = {
            find: jest.fn(),
        } as unknown as jest.Mocked<Repository<AdminUser>>;
        tokenRepo = {} as jest.Mocked<Repository<AdminInviteToken>>;

        txAdminRepo = {
            findOne: jest.fn(),
            create: jest.fn((dto) => ({ ...dto, id: 'new-admin-id' } as AdminUser)),
            save: jest.fn(async (entity) => entity as AdminUser),
            update: jest.fn(),
            count: jest.fn(),
        } as unknown as jest.Mocked<Repository<AdminUser>>;
        txTokenRepo = {
            update: jest.fn(),
            create: jest.fn((dto) => ({ ...dto, id: 'new-token-id' } as AdminInviteToken)),
            save: jest.fn(async (entity) => entity as AdminInviteToken),
        } as unknown as jest.Mocked<Repository<AdminInviteToken>>;
        const txManager = {
            getRepository: jest.fn((entity) => {
                if (entity === AdminUser) return txAdminRepo;
                if (entity === AdminInviteToken) return txTokenRepo;
                throw new Error(`Unexpected getRepository call: ${String(entity)}`);
            }),
        } as unknown as EntityManager;
        dataSource = {
            transaction: jest.fn(async (cb: (m: EntityManager) => Promise<unknown>) => cb(txManager)),
        } as unknown as jest.Mocked<Pick<DataSource, 'transaction'>>;
        mailService = { isEnabled: jest.fn().mockReturnValue(true), sendAdminSetPasswordLink: jest.fn() };
        configService = { get: jest.fn().mockReturnValue('https://admin.fit-calendar.ru') };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AdminUsersService,
                { provide: getRepositoryToken(AdminUser), useValue: adminRepo },
                { provide: getRepositoryToken(AdminInviteToken), useValue: tokenRepo },
                { provide: getDataSourceToken(), useValue: dataSource },
                { provide: MailService, useValue: mailService },
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();

        service = module.get<AdminUsersService>(AdminUsersService);
    });

    describe('list', () => {
        it('returns admins ordered by createdAt with ISO timestamps', async () => {
            adminRepo.find.mockResolvedValue([
                buildAdmin({ id: 'a', login: 'alice', lastLoginAt: new Date('2026-02-01T00:00:00Z') }),
                buildAdmin({ id: 'b', login: 'bob', isActive: false }),
            ]);

            const result = await service.list();

            expect(adminRepo.find).toHaveBeenCalledWith({ order: { createdAt: 'ASC' } });
            expect(result).toHaveLength(2);
            expect(result[0]).toMatchObject({
                id: 'a',
                login: 'alice',
                lastLoginAt: '2026-02-01T00:00:00.000Z',
            });
            expect(result[1].lastLoginAt).toBeNull();
        });
    });

    describe('invite', () => {
        it('inserts a new inactive row with sentinel hash + issues an invite token', async () => {
            txAdminRepo.findOne.mockResolvedValue(null);

            const result = await service.invite('issuer-1', 'fresh', 'Fresh');

            expect(txAdminRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({ login: 'fresh', name: 'Fresh', isActive: false }),
            );
            const createdAdmin = txAdminRepo.create.mock.results[0].value as AdminUser;
            expect(createdAdmin.passwordHash).toMatch(/^\$2[aby]\$/);
            expect(txTokenRepo.update).toHaveBeenCalledWith(
                { adminUserId: 'new-admin-id', consumedAt: IsNull() },
                expect.objectContaining({ consumedAt: expect.any(Date) }),
            );
            expect(txTokenRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({ purpose: 'invite', issuedByAdminId: 'issuer-1' }),
            );
            expect(result.action).toBe('created');
            expect(result.token).toMatch(/^[A-Za-z0-9_-]{40,}$/);
        });

        it('reactivates an existing inactive row and updates its name', async () => {
            txAdminRepo.findOne.mockResolvedValue(buildAdmin({ isActive: false, name: 'Old Name' }));

            const result = await service.invite('issuer-1', 'a', 'New Name');

            expect(result.action).toBe('reactivated');
            const savedAdmin = txAdminRepo.save.mock.calls[0][0] as AdminUser;
            expect(savedAdmin.name).toBe('New Name');
        });

        it('rejects when the login belongs to an active admin (use reset instead)', async () => {
            txAdminRepo.findOne.mockResolvedValue(buildAdmin({ isActive: true }));

            await expect(service.invite('issuer-1', 'a', 'Whoever')).rejects.toBeInstanceOf(ConflictException);
            expect(txTokenRepo.save).not.toHaveBeenCalled();
        });
    });

    describe('issueReset', () => {
        it('issues a reset token for an existing admin', async () => {
            txAdminRepo.findOne.mockResolvedValue(buildAdmin());

            const result = await service.issueReset('issuer-1', 'admin-1');

            expect(result.action).toBe('reset');
            expect(txTokenRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({ purpose: 'reset', adminUserId: 'admin-1' }),
            );
        });

        it('invalidates prior outstanding tokens for the same admin', async () => {
            txAdminRepo.findOne.mockResolvedValue(buildAdmin());

            await service.issueReset('issuer-1', 'admin-1');

            expect(txTokenRepo.update).toHaveBeenCalledWith(
                { adminUserId: 'admin-1', consumedAt: IsNull() },
                expect.objectContaining({ consumedAt: expect.any(Date) }),
            );
        });

        it('throws NotFound when the admin does not exist', async () => {
            txAdminRepo.findOne.mockResolvedValue(null);

            await expect(service.issueReset('issuer-1', 'ghost')).rejects.toBeInstanceOf(NotFoundException);
        });
    });

    describe('email delivery on invite', () => {
        it('sends the link by email when the login is an email and SMTP is enabled', async () => {
            txAdminRepo.findOne.mockResolvedValue(null);

            const result = await service.invite('issuer-1', 'masha@example.com', 'Мария');

            expect(mailService.sendAdminSetPasswordLink).toHaveBeenCalledTimes(1);
            const arg = mailService.sendAdminSetPasswordLink.mock.calls[0][0];
            expect(arg).toMatchObject({ to: 'masha@example.com', name: 'Мария', purpose: 'invite' });
            expect(arg.url).toBe(
                `https://admin.fit-calendar.ru/set-password?token=${encodeURIComponent(result.token)}`,
            );
            expect(result.emailSent).toBe(true);
            expect(result.sentToEmail).toBe('masha@example.com');
        });

        it('does not send email when the login is not an email', async () => {
            txAdminRepo.findOne.mockResolvedValue(null);

            const result = await service.invite('issuer-1', 'masha', 'Мария');

            expect(mailService.sendAdminSetPasswordLink).not.toHaveBeenCalled();
            expect(result.emailSent).toBe(false);
            expect(result.sentToEmail).toBeNull();
        });

        it('still succeeds with emailSent=false when sending throws', async () => {
            txAdminRepo.findOne.mockResolvedValue(null);
            mailService.sendAdminSetPasswordLink.mockRejectedValue(new Error('SMTP down'));

            const result = await service.invite('issuer-1', 'masha@example.com', 'Мария');

            expect(result.token).toMatch(/^[A-Za-z0-9_-]{40,}$/);
            expect(result.emailSent).toBe(false);
            expect(result.sentToEmail).toBeNull();
        });

        it('skips email when SMTP is disabled', async () => {
            txAdminRepo.findOne.mockResolvedValue(null);
            mailService.isEnabled.mockReturnValue(false);

            const result = await service.invite('issuer-1', 'masha@example.com', 'Мария');

            expect(mailService.sendAdminSetPasswordLink).not.toHaveBeenCalled();
            expect(result.emailSent).toBe(false);
        });
    });

    describe('deactivate', () => {
        it('rejects deactivating yourself', async () => {
            await expect(service.deactivate('admin-1', 'admin-1')).rejects.toBeInstanceOf(ConflictException);
            expect(dataSource.transaction).not.toHaveBeenCalled();
        });

        it('rejects deactivating the last active admin', async () => {
            txAdminRepo.findOne.mockResolvedValue(buildAdmin({ id: 'admin-2', isActive: true }));
            txAdminRepo.count.mockResolvedValue(1);

            await expect(service.deactivate('admin-1', 'admin-2')).rejects.toBeInstanceOf(ConflictException);
            expect(txAdminRepo.update).not.toHaveBeenCalled();
        });

        it('throws NotFound when the target does not exist', async () => {
            txAdminRepo.findOne.mockResolvedValue(null);

            await expect(service.deactivate('admin-1', 'ghost')).rejects.toBeInstanceOf(NotFoundException);
        });

        it('deactivates the admin and consumes their outstanding tokens', async () => {
            txAdminRepo.findOne.mockResolvedValue(buildAdmin({ id: 'admin-2', isActive: true }));
            txAdminRepo.count.mockResolvedValue(2);

            await service.deactivate('admin-1', 'admin-2');

            expect(txAdminRepo.update).toHaveBeenCalledWith({ id: 'admin-2' }, { isActive: false });
            expect(txTokenRepo.update).toHaveBeenCalledWith(
                { adminUserId: 'admin-2', consumedAt: IsNull() },
                expect.objectContaining({ consumedAt: expect.any(Date) }),
            );
        });
    });
});
