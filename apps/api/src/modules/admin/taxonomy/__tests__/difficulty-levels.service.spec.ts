import { DifficultyLevel, TrainingType } from '@fitcalendar/db';
import { ConflictException } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { AdminAuditService } from '../../audit';
import { DifficultyLevelsService } from '../difficulty-levels.service';

const mockAuditService = { record: jest.fn().mockResolvedValue(undefined) };

describe('DifficultyLevelsService (shared TaxonomyCrudService)', () => {
    let service: DifficultyLevelsService;
    let repo: {
        find: jest.Mock;
        findOne: jest.Mock;
        create: jest.Mock;
        save: jest.Mock;
        remove: jest.Mock;
        createQueryBuilder: jest.Mock;
    };
    let typeRepo: { count: jest.Mock };

    beforeEach(async () => {
        mockAuditService.record.mockClear();
        repo = {
            find: jest.fn(),
            findOne: jest.fn().mockResolvedValue(null),
            create: jest.fn((dto) => dto as DifficultyLevel),
            save: jest.fn(async (e) => e as DifficultyLevel),
            remove: jest.fn(async (e) => e as DifficultyLevel),
            createQueryBuilder: jest.fn(),
        };
        typeRepo = { count: jest.fn().mockResolvedValue(0) };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DifficultyLevelsService,
                { provide: getRepositoryToken(DifficultyLevel), useValue: repo },
                { provide: getRepositoryToken(TrainingType), useValue: typeRepo },
                { provide: AdminAuditService, useValue: mockAuditService },
            ],
        }).compile();

        service = module.get(DifficultyLevelsService);
    });

    it('create derives a transliterated key and the next sortOrder', async () => {
        repo.createQueryBuilder.mockReturnValueOnce({
            select: jest.fn().mockReturnThis(),
            getRawOne: jest.fn().mockResolvedValue({ max: 2 }),
        });

        await service.create({ label: 'Профи', color: 'purple' });

        expect(repo.create).toHaveBeenCalledWith(
            expect.objectContaining({ key: 'profi', label: 'Профи', color: 'purple', sortOrder: 3, isActive: true }),
        );
    });

    it('create de-duplicates the key when the slug already exists', async () => {
        // First existence check hits, second is free.
        repo.findOne.mockResolvedValueOnce({ id: 'x', key: 'profi' }).mockResolvedValueOnce(null);
        repo.createQueryBuilder.mockReturnValueOnce({
            select: jest.fn().mockReturnThis(),
            getRawOne: jest.fn().mockResolvedValue({ max: -1 }),
        });

        await service.create({ label: 'Профи', color: 'purple' });

        expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ key: 'profi-2', sortOrder: 0 }));
    });

    it('deleteItem throws 409 when the level is referenced by training types', async () => {
        repo.findOne.mockResolvedValueOnce({ id: 'd1', key: 'beginner', label: 'Начальный' });
        typeRepo.count.mockResolvedValueOnce(3);

        await expect(service.deleteItem('d1')).rejects.toThrow(ConflictException);
        expect(repo.remove).not.toHaveBeenCalled();
        expect(mockAuditService.record).not.toHaveBeenCalled();
    });

    it('deleteItem removes and audits when unreferenced', async () => {
        const entity = { id: 'd1', key: 'profi', label: 'Профи' };
        repo.findOne.mockResolvedValueOnce(entity);
        typeRepo.count.mockResolvedValueOnce(0);

        await service.deleteItem('d1', { adminUserId: 'a1', ipAddress: '127.0.0.1' });

        expect(repo.remove).toHaveBeenCalledWith(entity);
        expect(mockAuditService.record).toHaveBeenCalledWith(
            expect.objectContaining({ action: 'delete_difficulty_level', resourceId: 'd1' }),
        );
    });
});
