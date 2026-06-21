import { BotSubscriber } from '@fitcalendar/db';
import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { BotSubscriberService } from '../bot-subscriber.service';

describe('BotSubscriberService', () => {
    let service: BotSubscriberService;
    let repo: { upsert: jest.Mock; update: jest.Mock; createQueryBuilder: jest.Mock };
    let getRawMany: jest.Mock;

    beforeEach(async () => {
        getRawMany = jest.fn().mockResolvedValue([{ telegramId: '111' }, { telegramId: '222' }]);
        repo = {
            upsert: jest.fn().mockResolvedValue(undefined),
            update: jest.fn().mockResolvedValue(undefined),
            createQueryBuilder: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                getRawMany,
            }),
        };
        const module: TestingModule = await Test.createTestingModule({
            providers: [BotSubscriberService, { provide: getRepositoryToken(BotSubscriber), useValue: repo }],
        }).compile();
        service = module.get(BotSubscriberService);
    });

    it('upsert inserts/reactivates by telegramId with isActive=true', async () => {
        await service.upsert({ telegramId: 111, firstName: 'Анна', username: 'anna', source: 'bot' });
        expect(repo.upsert).toHaveBeenCalledWith(
            expect.objectContaining({ telegramId: 111, isActive: true, source: 'bot', firstName: 'Анна' }),
            ['telegramId'],
        );
    });

    it('deactivate flips isActive to false for the telegramId', async () => {
        await service.deactivate(111);
        expect(repo.update).toHaveBeenCalledWith({ telegramId: 111 }, { isActive: false });
    });

    it('findActiveRecipients returns numeric telegramIds for active rows', async () => {
        const result = await service.findActiveRecipients();
        expect(result).toEqual([{ telegramId: 111 }, { telegramId: 222 }]);
    });
});
