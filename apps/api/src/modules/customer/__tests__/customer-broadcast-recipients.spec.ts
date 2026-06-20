import { Customer, CustomerMembership, Reminder } from '@fitcalendar/db';
import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { AdminAuditService } from '../../admin/audit';
import { CustomerService } from '../customer.service';

describe('CustomerService.findBroadcastRecipients', () => {
    let service: CustomerService;
    let getRawMany: jest.Mock;

    beforeEach(async () => {
        getRawMany = jest.fn().mockResolvedValue([
            { id: 'c1', telegramId: '111' },
            { id: 'c2', telegramId: '222' },
        ]);
        const qb = {
            select: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            getRawMany,
        };
        const customerRepo = { createQueryBuilder: jest.fn().mockReturnValue(qb) };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CustomerService,
                { provide: getRepositoryToken(Customer), useValue: customerRepo },
                { provide: getRepositoryToken(Reminder), useValue: {} },
                { provide: getRepositoryToken(CustomerMembership), useValue: {} },
                { provide: AdminAuditService, useValue: { record: jest.fn() } },
            ],
        }).compile();

        service = module.get(CustomerService);
    });

    it('returns id + numeric telegramId for all linked, active customers', async () => {
        const result = await service.findBroadcastRecipients();
        expect(result).toEqual([
            { id: 'c1', telegramId: 111 },
            { id: 'c2', telegramId: 222 },
        ]);
    });
});
