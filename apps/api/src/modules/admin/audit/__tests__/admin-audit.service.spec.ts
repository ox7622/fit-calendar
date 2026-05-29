import { AdminAuditLog } from '@fitcalendar/db';
import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';

import { AdminAuditService } from '../admin-audit.service';

describe('AdminAuditService', () => {
    let service: AdminAuditService;
    let repo: jest.Mocked<Repository<AdminAuditLog>>;

    beforeEach(async () => {
        repo = {
            create: jest.fn((dto) => dto as AdminAuditLog),
            save: jest.fn(),
        } as unknown as jest.Mocked<Repository<AdminAuditLog>>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [AdminAuditService, { provide: getRepositoryToken(AdminAuditLog), useValue: repo }],
        }).compile();

        service = module.get(AdminAuditService);
    });

    it('persists the audit entry with all fields', async () => {
        await service.record({
            adminUserId: 'admin-1',
            action: 'delete_customer',
            resourceType: 'customer',
            resourceId: 'cust-7',
            metadata: { phone: '+74951234567' },
            ipAddress: '10.0.0.1',
        });

        expect(repo.create).toHaveBeenCalledWith({
            adminUserId: 'admin-1',
            action: 'delete_customer',
            resourceType: 'customer',
            resourceId: 'cust-7',
            metadata: { phone: '+74951234567' },
            ipAddress: '10.0.0.1',
        });
        expect(repo.save).toHaveBeenCalled();
    });

    it('defaults metadata and ipAddress to null when omitted', async () => {
        await service.record({
            adminUserId: 'admin-1',
            action: 'delete_plan',
            resourceType: 'membership_plan',
            resourceId: 'plan-7',
        });

        expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ metadata: null, ipAddress: null }));
    });

    it('swallows persistence errors so the user-facing action is not blocked', async () => {
        repo.save.mockRejectedValueOnce(new Error('db down'));

        await expect(
            service.record({
                adminUserId: null,
                action: 'delete_customer',
                resourceType: 'customer',
                resourceId: 'cust-7',
            }),
        ).resolves.toBeUndefined();
    });
});
