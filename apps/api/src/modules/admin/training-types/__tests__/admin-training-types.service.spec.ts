import { ScheduleEntry, TrainingType } from '@fitcalendar/db';
import { ConflictException, NotFoundException } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { AdminTrainingTypesService } from '../admin-training-types.service';

const buildType = (overrides: Partial<TrainingType> = {}): TrainingType =>
    ({
        id: 'type-1',
        name: 'Йога',
        description: null,
        difficulty: 'beginner',
        impactTypes: ['flexibility'],
        equipment: [],
        isActive: true,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
        ...overrides,
    } as TrainingType);

describe('AdminTrainingTypesService', () => {
    let service: AdminTrainingTypesService;
    let typeRepo: {
        find: jest.Mock;
        findOne: jest.Mock;
        create: jest.Mock;
        save: jest.Mock;
        remove: jest.Mock;
    };
    let scheduleRepo: { count: jest.Mock };

    beforeEach(async () => {
        typeRepo = {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn((dto) => dto as TrainingType),
            save: jest.fn(async (entity) => entity as TrainingType),
            remove: jest.fn(async (entity) => entity as TrainingType),
        };
        scheduleRepo = { count: jest.fn().mockResolvedValue(0) };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AdminTrainingTypesService,
                { provide: getRepositoryToken(TrainingType), useValue: typeRepo },
                { provide: getRepositoryToken(ScheduleEntry), useValue: scheduleRepo },
            ],
        }).compile();

        service = module.get(AdminTrainingTypesService);
    });

    it('findAll returns types sorted by name ASC', async () => {
        typeRepo.find.mockResolvedValueOnce([
            buildType({ id: '1', name: 'Йога' }),
            buildType({ id: '2', name: 'Силовая' }),
        ]);

        const result = await service.findAll();

        expect(typeRepo.find).toHaveBeenCalledWith({ order: { name: 'ASC' } });
        expect(result).toHaveLength(2);
    });

    it('findOptions excludes inactive and projects to id+name', async () => {
        typeRepo.find.mockResolvedValueOnce([buildType({ id: 'a', name: 'Йога', isActive: true })]);

        const result = await service.findOptions();

        expect(typeRepo.find).toHaveBeenCalledWith({
            where: { isActive: true },
            order: { name: 'ASC' },
            select: ['id', 'name'],
        });
        expect(result).toEqual([{ id: 'a', name: 'Йога' }]);
    });

    it('create persists with defaults (isActive=true, description=null)', async () => {
        const saved = buildType({ id: 'new' });
        typeRepo.save.mockResolvedValueOnce(saved);

        await service.create({
            name: 'Пилатес',
            difficulty: 'intermediate',
            impactTypes: ['flexibility', 'balance'],
            equipment: ['Коврик'],
        });

        expect(typeRepo.create).toHaveBeenCalledWith(
            expect.objectContaining({
                name: 'Пилатес',
                difficulty: 'intermediate',
                impactTypes: ['flexibility', 'balance'],
                equipment: ['Коврик'],
                isActive: true,
                description: null,
            }),
        );
    });

    it('update throws 404 when type missing', async () => {
        typeRepo.findOne.mockResolvedValueOnce(null);

        await expect(service.update('missing', { name: 'X' })).rejects.toThrow(NotFoundException);
    });

    it('update merges only defined fields (deactivation is just isActive=false)', async () => {
        const existing = buildType({ id: 't1', isActive: true });
        typeRepo.findOne.mockResolvedValueOnce(existing);
        typeRepo.save.mockResolvedValueOnce({ ...existing, isActive: false } as TrainingType);

        const result = await service.update('t1', { isActive: false });

        expect(result.isActive).toBe(false);
        expect(scheduleRepo.count).not.toHaveBeenCalled();
    });

    it('deleteType removes when zero schedule entries', async () => {
        const existing = buildType({ id: 't1' });
        typeRepo.findOne.mockResolvedValueOnce(existing);
        scheduleRepo.count.mockResolvedValueOnce(0);

        await service.deleteType('t1');

        expect(scheduleRepo.count).toHaveBeenCalledWith({ where: { trainingTypeId: 't1' } });
        expect(typeRepo.remove).toHaveBeenCalledWith(existing);
    });

    it('deleteType throws 409 when type has any schedule entries', async () => {
        typeRepo.findOne.mockResolvedValueOnce(buildType({ id: 't1' }));
        scheduleRepo.count.mockResolvedValueOnce(5);

        await expect(service.deleteType('t1')).rejects.toThrow(ConflictException);
        expect(typeRepo.remove).not.toHaveBeenCalled();
    });

    it('findById returns the type when it exists', async () => {
        typeRepo.findOne.mockResolvedValueOnce(buildType({ id: 't1', name: 'Йога' }));

        const result = await service.findById('t1');

        expect(result.id).toBe('t1');
        expect(result.name).toBe('Йога');
    });

    it('findById throws 404 when missing', async () => {
        typeRepo.findOne.mockResolvedValueOnce(null);
        await expect(service.findById('missing')).rejects.toThrow(NotFoundException);
    });

    it('deleteType throws 404 when type does not exist', async () => {
        typeRepo.findOne.mockResolvedValueOnce(null);
        await expect(service.deleteType('missing')).rejects.toThrow(NotFoundException);
        expect(scheduleRepo.count).not.toHaveBeenCalled();
    });

    it('update patches every editable field when all are provided', async () => {
        // Covers the conditional branches for name/description/difficulty/impactTypes/equipment
        // that other tests skip (existing 'isActive=false' test only hits one branch).
        const existing = buildType({
            id: 't1',
            name: 'Йога',
            description: null,
            difficulty: 'beginner',
            impactTypes: ['flexibility'],
            equipment: [],
            isActive: true,
        });
        typeRepo.findOne.mockResolvedValueOnce(existing);
        typeRepo.save.mockImplementationOnce(async (e) => e as TrainingType);

        const result = await service.update('t1', {
            name: 'Силовая йога',
            description: 'Активный класс',
            difficulty: 'advanced',
            impactTypes: ['flexibility', 'strength'],
            equipment: ['Коврик', 'Гантели'],
            isActive: false,
        });

        expect(result.name).toBe('Силовая йога');
        expect(result.description).toBe('Активный класс');
        expect(result.difficulty).toBe('advanced');
        expect(result.impactTypes).toEqual(['flexibility', 'strength']);
        expect(result.equipment).toEqual(['Коврик', 'Гантели']);
        expect(result.isActive).toBe(false);
    });
});
