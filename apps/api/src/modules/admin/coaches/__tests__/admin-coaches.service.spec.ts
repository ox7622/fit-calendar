import { Coach, ScheduleEntry } from '@fitcalendar/db';
import { ConflictException, NotFoundException } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { AdminAuditService } from '../../audit';
import { CloudinaryService } from '../../uploads/cloudinary.service';
import { AdminCoachesService } from '../admin-coaches.service';

const mockAuditService = { record: jest.fn().mockResolvedValue(undefined) };

const buildCoach = (overrides: Partial<Coach> = {}): Coach =>
    ({
        id: 'coach-1',
        name: 'Мария',
        bio: null,
        photoUrl: null,
        specializations: [],
        certifications: [],
        isActive: true,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
        ...overrides,
    } as Coach);

describe('AdminCoachesService', () => {
    let service: AdminCoachesService;
    let coachRepo: jest.Mocked<{
        find: jest.Mock;
        findOne: jest.Mock;
        create: jest.Mock;
        save: jest.Mock;
        remove: jest.Mock;
    }>;
    let scheduleRepo: jest.Mocked<{ count: jest.Mock }>;
    let cloudinary: jest.Mocked<Pick<CloudinaryService, 'uploadCoachPhoto'>>;

    beforeEach(async () => {
        mockAuditService.record.mockClear();
        coachRepo = {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn((dto) => dto as Coach),
            save: jest.fn(async (entity) => entity as Coach),
            remove: jest.fn(async (entity) => entity as Coach),
        };
        scheduleRepo = { count: jest.fn().mockResolvedValue(0) };
        cloudinary = { uploadCoachPhoto: jest.fn() };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AdminCoachesService,
                { provide: getRepositoryToken(Coach), useValue: coachRepo },
                { provide: getRepositoryToken(ScheduleEntry), useValue: scheduleRepo },
                { provide: CloudinaryService, useValue: cloudinary },
                { provide: AdminAuditService, useValue: mockAuditService },
            ],
        }).compile();

        service = module.get(AdminCoachesService);
    });

    describe('findAll', () => {
        it('returns coaches sorted by name ASC', async () => {
            coachRepo.find.mockResolvedValueOnce([
                buildCoach({ id: '1', name: 'Анна' }),
                buildCoach({ id: '2', name: 'Борис' }),
            ]);

            const result = await service.findAll();

            expect(coachRepo.find).toHaveBeenCalledWith({ order: { name: 'ASC' } });
            expect(result).toHaveLength(2);
        });
    });

    describe('findOptions', () => {
        it('returns active coaches only with id+name shape', async () => {
            coachRepo.find.mockResolvedValueOnce([buildCoach({ id: 'a', name: 'Анна', isActive: true })]);

            const result = await service.findOptions();

            expect(coachRepo.find).toHaveBeenCalledWith({
                where: { isActive: true },
                order: { name: 'ASC' },
                select: ['id', 'name'],
            });
            expect(result).toEqual([{ id: 'a', name: 'Анна' }]);
        });
    });

    describe('create', () => {
        it('creates with defaults (isActive=true, photoUrl=null)', async () => {
            const saved = buildCoach({ id: 'new', name: 'Иван' });
            coachRepo.save.mockResolvedValueOnce(saved);

            const result = await service.create({
                name: 'Иван',
                specializations: ['Йога'],
                certifications: ['ACE'],
            });

            expect(coachRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({ isActive: true, photoUrl: null, name: 'Иван' }),
            );
            expect(result.id).toBe('new');
        });
    });

    describe('update', () => {
        it('throws 404 when coach missing', async () => {
            coachRepo.findOne.mockResolvedValueOnce(null);

            await expect(service.update('missing', { name: 'X' })).rejects.toThrow(NotFoundException);
        });

        it('deactivation (isActive=false) is a metadata change — does not touch schedule entries', async () => {
            const existing = buildCoach({ id: 'c1', isActive: true });
            coachRepo.findOne.mockResolvedValueOnce(existing);
            coachRepo.save.mockResolvedValueOnce({ ...existing, isActive: false } as Coach);

            const result = await service.update('c1', { isActive: false });

            expect(result.isActive).toBe(false);
            // Service never calls into scheduleRepo on update — only on delete.
            expect(scheduleRepo.count).not.toHaveBeenCalled();
        });
    });

    describe('setPhoto', () => {
        it('uploads via CloudinaryService and persists the returned URL', async () => {
            const existing = buildCoach({ id: 'c1' });
            coachRepo.findOne.mockResolvedValueOnce(existing);
            cloudinary.uploadCoachPhoto.mockResolvedValueOnce('https://cdn.example/photo.jpg');
            coachRepo.save.mockImplementationOnce(async (e) => e as Coach);

            const result = await service.setPhoto('c1', Buffer.from('img'));

            expect(cloudinary.uploadCoachPhoto).toHaveBeenCalledWith(expect.any(Buffer), 'c1');
            expect(result.photoUrl).toBe('https://cdn.example/photo.jpg');
            expect(existing.photoUrl).toBe('https://cdn.example/photo.jpg');
        });
    });

    describe('deleteCoach', () => {
        it('removes when zero schedule entries', async () => {
            const existing = buildCoach({ id: 'c1' });
            coachRepo.findOne.mockResolvedValueOnce(existing);
            scheduleRepo.count.mockResolvedValueOnce(0);

            await service.deleteCoach('c1');

            expect(coachRepo.remove).toHaveBeenCalledWith(existing);
        });

        it('throws 409 when coach has any schedule entries', async () => {
            coachRepo.findOne.mockResolvedValueOnce(buildCoach({ id: 'c1' }));
            scheduleRepo.count.mockResolvedValueOnce(3);

            await expect(service.deleteCoach('c1')).rejects.toThrow(ConflictException);
            expect(coachRepo.remove).not.toHaveBeenCalled();
        });

        it('throws 404 when coach does not exist', async () => {
            coachRepo.findOne.mockResolvedValueOnce(null);

            await expect(service.deleteCoach('missing')).rejects.toThrow(NotFoundException);
        });
    });

    describe('findById', () => {
        it('returns the coach when it exists', async () => {
            coachRepo.findOne.mockResolvedValueOnce(buildCoach({ id: 'c1', name: 'Мария' }));

            const result = await service.findById('c1');

            expect(result.id).toBe('c1');
            expect(result.name).toBe('Мария');
        });

        it('throws 404 when missing', async () => {
            coachRepo.findOne.mockResolvedValueOnce(null);
            await expect(service.findById('missing')).rejects.toThrow(NotFoundException);
        });
    });

    describe('setPhoto', () => {
        it('throws 404 when coach does not exist (does not call Cloudinary)', async () => {
            coachRepo.findOne.mockResolvedValueOnce(null);

            await expect(service.setPhoto('missing', Buffer.from('img'))).rejects.toThrow(NotFoundException);
            expect(cloudinary.uploadCoachPhoto).not.toHaveBeenCalled();
        });
    });

    describe('update — full-field patching', () => {
        it('patches every editable field when all provided', async () => {
            // Other tests only exercise isActive — this covers name/bio/specializations/certifications too.
            const existing = buildCoach({
                id: 'c1',
                name: 'Мария',
                bio: null,
                specializations: [],
                certifications: [],
                isActive: true,
            });
            coachRepo.findOne.mockResolvedValueOnce(existing);
            coachRepo.save.mockImplementationOnce(async (c) => c as Coach);

            const result = await service.update('c1', {
                name: 'Мария И.',
                bio: 'Сертифицированный тренер по йоге',
                specializations: ['Йога', 'Пилатес'],
                certifications: ['ACE', 'NASM'],
                isActive: false,
            });

            expect(result.name).toBe('Мария И.');
            expect(result.bio).toBe('Сертифицированный тренер по йоге');
            expect(result.specializations).toEqual(['Йога', 'Пилатес']);
            expect(result.certifications).toEqual(['ACE', 'NASM']);
            expect(result.isActive).toBe(false);
        });
    });

    describe('countScheduleEntries', () => {
        it('delegates to the schedule repo with the right filter', async () => {
            scheduleRepo.count.mockResolvedValueOnce(7);

            const result = await service.countScheduleEntries('c1');

            expect(scheduleRepo.count).toHaveBeenCalledWith({ where: { coachId: 'c1' } });
            expect(result).toBe(7);
        });
    });
});
