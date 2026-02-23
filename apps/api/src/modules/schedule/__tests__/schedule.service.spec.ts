import type { Coach, TrainingType } from '@fitcalendar/db';
import { ScheduleEntry } from '@fitcalendar/db';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';

import { ScheduleService } from '../schedule.service';

// Helper to create a mock ScheduleEntry
function createMockEntry(
    overrides: Partial<ScheduleEntry> = {},
    startTime: Date = new Date('2026-02-22T09:00:00Z'),
): ScheduleEntry {
    const coach: Coach = {
        id: 'coach-uuid-1',
        name: 'Ivan Petrov',
        bio: null,
        photoUrl: 'https://example.com/photo.jpg',
        specializations: [],
        certifications: [],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        scheduleEntries: [],
    };

    const trainingType: TrainingType = {
        id: 'type-uuid-1',
        name: 'Yoga',
        description: null,
        difficulty: 'beginner',
        impactTypes: ['flexibility'],
        equipment: [],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        scheduleEntries: [],
    };

    const base: ScheduleEntry = {
        id: 'entry-uuid-1',
        trainingTypeId: trainingType.id,
        coachId: coach.id,
        startTime,
        durationMinutes: 60,
        status: 'scheduled',
        cancellationReason: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        trainingType,
        coach,
        reminders: [],
        ...overrides,
    };

    return base;
}

describe('ScheduleService', () => {
    let service: ScheduleService;
    let mockRepository: jest.Mocked<Repository<ScheduleEntry>>;

    beforeEach(async () => {
        mockRepository = {
            find: jest.fn(),
        } as unknown as jest.Mocked<Repository<ScheduleEntry>>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ScheduleService,
                {
                    provide: getRepositoryToken(ScheduleEntry),
                    useValue: mockRepository,
                },
            ],
        }).compile();

        service = module.get<ScheduleService>(ScheduleService);
    });

    describe('getToday', () => {
        it('should return scheduled classes for today', async () => {
            const today = new Date();
            today.setHours(10, 0, 0, 0);
            const entry = createMockEntry({}, today);
            mockRepository.find.mockResolvedValue([entry]);

            const result = await service.getToday();

            expect(result).toHaveLength(1);
            expect(result[0]?.id).toBe('entry-uuid-1');
            expect(result[0]?.name).toBe('Yoga');
            expect(result[0]?.coachName).toBe('Ivan Petrov');
            expect(result[0]?.status).toBe('scheduled');
        });

        it('should include cancelled classes when includeCancelled=true', async () => {
            const today = new Date();
            today.setHours(10, 0, 0, 0);
            const cancelledEntry = createMockEntry({ status: 'cancelled' }, today);
            mockRepository.find.mockResolvedValue([cancelledEntry]);

            const result = await service.getToday(true);

            expect(result).toHaveLength(1);
            expect(result[0]?.status).toBe('cancelled');
            // When includeCancelled=true, status filter should not be applied
            const callArgs = mockRepository.find.mock.calls[0]?.[0];
            expect(callArgs).toBeDefined();
            if (callArgs && 'where' in callArgs) {
                expect((callArgs.where as Record<string, unknown>)['status']).toBeUndefined();
            }
        });

        it('should filter to scheduled only by default', async () => {
            mockRepository.find.mockResolvedValue([]);

            await service.getToday(false);

            const callArgs = mockRepository.find.mock.calls[0]?.[0];
            expect(callArgs).toBeDefined();
            if (callArgs && 'where' in callArgs) {
                expect((callArgs.where as Record<string, unknown>)['status']).toBe('scheduled');
            }
        });

        it('should return empty array when no classes', async () => {
            mockRepository.find.mockResolvedValue([]);

            const result = await service.getToday();

            expect(result).toEqual([]);
        });
    });

    describe('getByDate', () => {
        it('should return classes for a specific date', async () => {
            const date = '2026-03-15';
            const entryDate = new Date('2026-03-15T09:00:00Z');
            const entry = createMockEntry({}, entryDate);
            mockRepository.find.mockResolvedValue([entry]);

            const result = await service.getByDate(date);

            expect(result).toHaveLength(1);
            expect(result[0]?.id).toBe('entry-uuid-1');
        });

        it('should compute endTime correctly', async () => {
            const entryDate = new Date('2026-03-15T09:00:00Z');
            const entry = createMockEntry({ durationMinutes: 60 }, entryDate);
            mockRepository.find.mockResolvedValue([entry]);

            const result = await service.getByDate('2026-03-15');

            expect(result[0]?.startTime).toBe('2026-03-15T09:00:00.000Z');
            expect(result[0]?.endTime).toBe('2026-03-15T10:00:00.000Z');
        });

        it('should return empty array when no classes', async () => {
            mockRepository.find.mockResolvedValue([]);

            const result = await service.getByDate('2026-03-20');

            expect(result).toEqual([]);
        });
    });

    describe('getWeek', () => {
        it('should return 7 days', async () => {
            mockRepository.find.mockResolvedValue([]);

            const result = await service.getWeek();

            expect(result.days).toHaveLength(7);
        });

        it('should include today as first day', async () => {
            mockRepository.find.mockResolvedValue([]);

            const result = await service.getWeek();

            const today = new Date();
            const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
                today.getDate(),
            ).padStart(2, '0')}`;
            expect(result.days[0]?.date).toBe(todayStr);
        });

        it('should group classes by date', async () => {
            const today = new Date();
            today.setHours(10, 0, 0, 0);
            const entry1 = createMockEntry({ id: 'entry-1' }, today);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const entry2 = createMockEntry({ id: 'entry-2' }, tomorrow);
            mockRepository.find.mockResolvedValue([entry1, entry2]);

            const result = await service.getWeek();

            expect(result.days[0]?.classes).toHaveLength(1);
            expect(result.days[1]?.classes).toHaveLength(1);
            expect(result.days[0]?.classes[0]?.id).toBe('entry-1');
            expect(result.days[1]?.classes[0]?.id).toBe('entry-2');
        });

        it('should return empty classes array for days with no classes', async () => {
            mockRepository.find.mockResolvedValue([]);

            const result = await service.getWeek();

            result.days.forEach((day) => {
                expect(day.classes).toEqual([]);
            });
        });

        it('should include coachPhotoUrl in the response', async () => {
            const today = new Date();
            today.setHours(10, 0, 0, 0);
            const entry = createMockEntry({}, today);
            mockRepository.find.mockResolvedValue([entry]);

            const result = await service.getWeek();

            expect(result.days[0]?.classes[0]?.coachPhotoUrl).toBe('https://example.com/photo.jpg');
        });
    });

    describe('mapToDto', () => {
        it('should correctly map entity fields to DTO', async () => {
            const startTime = new Date('2026-02-22T09:00:00Z');
            const entry = createMockEntry({ durationMinutes: 90 }, startTime);
            mockRepository.find.mockResolvedValue([entry]);

            const result = await service.getToday();
            const dto = result[0];

            expect(dto).toBeDefined();
            if (dto) {
                expect(dto.id).toBe('entry-uuid-1');
                expect(dto.name).toBe('Yoga');
                expect(dto.durationMinutes).toBe(90);
                expect(dto.difficulty).toBe('beginner');
                expect(dto.impactTypes).toEqual(['flexibility']);
                expect(dto.coachId).toBe('coach-uuid-1');
                expect(dto.coachName).toBe('Ivan Petrov');
                expect(dto.coachPhotoUrl).toBe('https://example.com/photo.jpg');
            }
        });
    });
});
