import { BotSubscriber } from '@fitcalendar/db';
import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { BotSubscriberService } from '../bot-subscriber.service';

describe('BotSubscriberService', () => {
    let service: BotSubscriberService;
    let repo: { upsert: jest.Mock; update: jest.Mock; find: jest.Mock };

    beforeEach(async () => {
        repo = {
            upsert: jest.fn().mockResolvedValue(undefined),
            update: jest.fn().mockResolvedValue(undefined),
            // The bigint→number transformer hydrates telegramId as a number on read.
            find: jest.fn().mockResolvedValue([{ telegramId: 111 }, { telegramId: 222 }]),
        };
        const module: TestingModule = await Test.createTestingModule({
            providers: [BotSubscriberService, { provide: getRepositoryToken(BotSubscriber), useValue: repo }],
        }).compile();
        service = module.get(BotSubscriberService);
    });

    it('upsert inserts/reactivates by telegramId with isActive=true', async () => {
        await service.upsert({ telegramId: 111, firstName: 'Анна' });
        expect(repo.upsert).toHaveBeenCalledWith(
            expect.objectContaining({ telegramId: 111, isActive: true, firstName: 'Анна' }),
            ['telegramId'],
        );
    });

    it('deactivate flips isActive to false for the telegramId', async () => {
        await service.deactivate(111);
        expect(repo.update).toHaveBeenCalledWith({ telegramId: 111 }, { isActive: false });
    });

    it('findActiveRecipients returns only active subscribers', async () => {
        const result = await service.findActiveRecipients();
        expect(repo.find).toHaveBeenCalledWith({ where: { isActive: true }, select: { telegramId: true } });
        expect(result).toEqual([{ telegramId: 111 }, { telegramId: 222 }]);
    });
});
