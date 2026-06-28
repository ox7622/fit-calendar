import type { Coach } from '@fitcalendar/db';
import { ScheduleEntry, TrainingType } from '@fitcalendar/db';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';

import { ClubService } from '../../club/club.service';
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
    let mockScheduleRepository: jest.Mocked<Repository<ScheduleEntry>>;
    let mockTrainingTypeRepository: jest.Mocked<Repository<TrainingType>>;
    let mockClubService: { getTimeZone: jest.Mock };

    beforeEach(async () => {
        mockScheduleRepository = {
            find: jest.fn(),
            findOne: jest.fn(),
        } as unknown as jest.Mocked<Repository<ScheduleEntry>>;

        mockTrainingTypeRepository = {
            find: jest.fn(),
        } as unknown as jest.Mocked<Repository<TrainingType>>;

        mockClubService = {
            getTimeZone: jest.fn().mockResolvedValue('UTC'),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ScheduleService,
                {
                    provide: getRepositoryToken(ScheduleEntry),
                    useValue: mockScheduleRepository,
                },
                {
                    provide: getRepositoryToken(TrainingType),
                    useValue: mockTrainingTypeRepository,
                },
                {
                    provide: ClubService,
                    useValue: mockClubService,
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
            mockScheduleRepository.find.mockResolvedValue([entry]);

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
            mockScheduleRepository.find.mockResolvedValue([cancelledEntry]);

            const result = await service.getToday({ includeCancelled: true });

            expect(result).toHaveLength(1);
            expect(result[0]?.status).toBe('cancelled');
            const callArgs = mockScheduleRepository.find.mock.calls[0]?.[0];
            expect(callArgs).toBeDefined();
            if (callArgs && 'where' in callArgs) {
                expect((callArgs.where as Record<string, unknown>)['status']).toBeUndefined();
            }
        });

        it('should filter to scheduled only by default', async () => {
            mockScheduleRepository.find.mockResolvedValue([]);

            await service.getToday({ includeCancelled: false });

            const callArgs = mockScheduleRepository.find.mock.calls[0]?.[0];
            expect(callArgs).toBeDefined();
            if (callArgs && 'where' in callArgs) {
                expect((callArgs.where as Record<string, unknown>)['status']).toBe('scheduled');
            }
        });

        it('should return empty array when no classes', async () => {
            mockScheduleRepository.find.mockResolvedValue([]);

            const result = await service.getToday();

            expect(result).toEqual([]);
        });
    });

    describe('getByDate', () => {
        it('should return classes for a specific date', async () => {
            const date = '2026-03-15';
            const entryDate = new Date('2026-03-15T09:00:00Z');
            const entry = createMockEntry({}, entryDate);
            mockScheduleRepository.find.mockResolvedValue([entry]);

            const result = await service.getByDate(date);

            expect(result).toHaveLength(1);
            expect(result[0]?.id).toBe('entry-uuid-1');
        });

        it('should compute endTime correctly', async () => {
            const entryDate = new Date('2026-03-15T09:00:00Z');
            const entry = createMockEntry({ durationMinutes: 60 }, entryDate);
            mockScheduleRepository.find.mockResolvedValue([entry]);

            const result = await service.getByDate('2026-03-15');

            expect(result[0]?.startTime).toBe('2026-03-15T09:00:00.000Z');
            expect(result[0]?.endTime).toBe('2026-03-15T10:00:00.000Z');
        });

        it('should return empty array when no classes', async () => {
            mockScheduleRepository.find.mockResolvedValue([]);

            const result = await service.getByDate('2026-03-20');

            expect(result).toEqual([]);
        });
    });

    describe('getWeek', () => {
        it('should return 7 days', async () => {
            mockScheduleRepository.find.mockResolvedValue([]);

            const result = await service.getWeek();

            expect(result.days).toHaveLength(7);
        });

        it('should include today as first day', async () => {
            mockScheduleRepository.find.mockResolvedValue([]);

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
            mockScheduleRepository.find.mockResolvedValue([entry1, entry2]);

            const result = await service.getWeek();

            expect(result.days[0]?.classes).toHaveLength(1);
            expect(result.days[1]?.classes).toHaveLength(1);
            expect(result.days[0]?.classes[0]?.id).toBe('entry-1');
            expect(result.days[1]?.classes[0]?.id).toBe('entry-2');
        });

        it('should return empty classes array for days with no classes', async () => {
            mockScheduleRepository.find.mockResolvedValue([]);

            const result = await service.getWeek();

            result.days.forEach((day) => {
                expect(day.classes).toEqual([]);
            });
        });

        it('should include coachPhotoUrl in the response', async () => {
            const today = new Date();
            today.setHours(10, 0, 0, 0);
            const entry = createMockEntry({}, today);
            mockScheduleRepository.find.mockResolvedValue([entry]);

            const result = await service.getWeek();

            expect(result.days[0]?.classes[0]?.coachPhotoUrl).toBe('https://example.com/photo.jpg');
        });
    });

    describe('mapToDto', () => {
        it('should correctly map entity fields to DTO', async () => {
            const startTime = new Date('2026-02-22T09:00:00Z');
            const entry = createMockEntry({ durationMinutes: 90 }, startTime);
            mockScheduleRepository.find.mockResolvedValue([entry]);

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

    describe('getById', () => {
        it('returns the mapped DTO when the entry exists', async () => {
            mockScheduleRepository.findOne.mockResolvedValueOnce(createMockEntry());

            const result = await service.getById('entry-uuid-1');

            expect(mockScheduleRepository.findOne).toHaveBeenCalledWith({
                where: { id: 'entry-uuid-1' },
                relations: ['trainingType', 'coach'],
            });
            expect(result.id).toBe('entry-uuid-1');
            expect(result.name).toBe('Yoga');
        });

        it('throws NotFoundException when the entry does not exist', async () => {
            mockScheduleRepository.findOne.mockResolvedValueOnce(null);

            await expect(service.getById('missing')).rejects.toThrow(/not found/);
        });
    });

    describe('filter composition (buildWhere via getToday)', () => {
        it('applies coachId filter to the where clause', async () => {
            mockScheduleRepository.find.mockResolvedValueOnce([]);

            await service.getToday({ coachId: 'coach-x' });

            const where = mockScheduleRepository.find.mock.calls[0]?.[0]?.where as Record<string, unknown>;
            expect(where.coachId).toBe('coach-x');
            expect(where.status).toBe('scheduled');
        });

        it('applies trainingTypeId filter', async () => {
            mockScheduleRepository.find.mockResolvedValueOnce([]);

            await service.getToday({ trainingTypeId: 'type-x' });

            const where = mockScheduleRepository.find.mock.calls[0]?.[0]?.where as Record<string, unknown>;
            expect(where.trainingTypeId).toBe('type-x');
        });

        it('routes difficultyLevel into the nested trainingType where clause', async () => {
            mockScheduleRepository.find.mockResolvedValueOnce([]);

            await service.getToday({ difficultyLevel: 'advanced' });

            const where = mockScheduleRepository.find.mock.calls[0]?.[0]?.where as Record<string, unknown>;
            // Filter is on the joined relation, not the top-level columns.
            const tt = where.trainingType as Record<string, unknown> | undefined;
            expect(tt?.difficulty).toBe('advanced');
        });

        it('routes impactType array into ArrayContains on the joined trainingType', async () => {
            mockScheduleRepository.find.mockResolvedValueOnce([]);

            await service.getToday({ impactType: ['cardio'] });

            const where = mockScheduleRepository.find.mock.calls[0]?.[0]?.where as Record<string, unknown>;
            const tt = where.trainingType as Record<string, unknown> | undefined;
            // ArrayContains returns a FindOperator instance — just verify it's set.
            expect(tt?.impactTypes).toBeDefined();
        });

        it('drops the status=scheduled clamp when includeCancelled is true', async () => {
            mockScheduleRepository.find.mockResolvedValueOnce([]);

            await service.getToday({ includeCancelled: true });

            const where = mockScheduleRepository.find.mock.calls[0]?.[0]?.where as Record<string, unknown>;
            expect(where.status).toBeUndefined();
        });
    });

    describe('getTrainingTypes', () => {
        it('returns active training types mapped to the metadata shape', async () => {
            mockTrainingTypeRepository.find.mockResolvedValueOnce([
                {
                    id: 't1',
                    name: 'Yoga',
                    description: null,
                    difficulty: 'beginner',
                    impactTypes: ['flexibility'],
                    equipment: ['Mat'],
                    isActive: true,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    scheduleEntries: [],
                } as TrainingType,
            ]);

            const result = await service.getTrainingTypes();

            expect(mockTrainingTypeRepository.find).toHaveBeenCalledWith({
                where: { isActive: true },
                order: { name: 'ASC' },
            });
            expect(result).toEqual([
                {
                    id: 't1',
                    name: 'Yoga',
                    description: null,
                    difficulty: 'beginner',
                    impactTypes: ['flexibility'],
                    equipment: ['Mat'],
                },
            ]);
        });
    });

    describe('getWeek weekOffset', () => {
        it('defaults to the current week (offset 0) and returns 7 days', async () => {
            mockScheduleRepository.find.mockResolvedValue([]);
            const result = await service.getWeek();
            expect(result.days).toHaveLength(7);
            const first = new Date(`${result.days[0].date}T00:00:00`);
            const today = new Date();
            expect(first.getDate()).toBe(today.getDate());
        });

        it('shifts the anchor by 7 days per offset', async () => {
            mockScheduleRepository.find.mockResolvedValue([]);
            const week0 = await service.getWeek({}, 0);
            const week1 = await service.getWeek({}, 1);
            const start0 = new Date(`${week0.days[0].date}T00:00:00`).getTime();
            const start1 = new Date(`${week1.days[0].date}T00:00:00`).getTime();
            expect(Math.round((start1 - start0) / 86_400_000)).toBe(7);
        });

        it('clamps an out-of-range offset', async () => {
            mockScheduleRepository.find.mockResolvedValue([]);
            const wayAhead = await service.getWeek({}, 999);
            const maxWeek = await service.getWeek({}, 8);
            expect(wayAhead.days[0].date).toBe(maxWeek.days[0].date);
        });
    });

    describe('static metadata helpers', () => {
        it('getDifficultyLevels returns the three known levels in order', () => {
            const levels = service.getDifficultyLevels();
            expect(levels.map((l) => l.value)).toEqual(['beginner', 'intermediate', 'advanced']);
        });

        it('getImpactTypes returns the four known impact tags', () => {
            const impacts = service.getImpactTypes();
            expect(impacts.map((i) => i.value)).toEqual(['cardio', 'strength', 'flexibility', 'balance']);
        });
    });

    describe('timezone bucketing', () => {
        it('getByDate queries the correct UTC window for a non-UTC club timezone', async () => {
            // Asia/Yekaterinburg is UTC+5.
            // Club day '2026-06-22' starts at 2026-06-21T19:00:00Z and ends at 2026-06-22T19:00:00Z.
            mockClubService.getTimeZone.mockResolvedValue('Asia/Yekaterinburg');
            mockScheduleRepository.find.mockResolvedValue([]);

            await service.getByDate('2026-06-22');

            const findCall = mockScheduleRepository.find.mock.calls[0];
            expect(findCall).toBeDefined();
            const where = findCall?.[0]?.where as Record<string, unknown>;
            // TypeORM Between stores the values on the FindOperator instance.

            const betweenOp = where['startTime'] as any;
            const rangeStart: Date = betweenOp._value[0];
            const rangeEnd: Date = betweenOp._value[1];

            expect(rangeStart.toISOString()).toBe('2026-06-21T19:00:00.000Z');
            expect(rangeEnd.toISOString()).toBe('2026-06-22T19:00:00.000Z');
        });

        it('a class at UTC midnight belongs to the next club day in UTC+5', async () => {
            // 2026-06-22T20:00Z = 2026-06-23 01:00 in Yekaterinburg (+5)
            // So it should appear on 2026-06-23, not 2026-06-22.
            mockClubService.getTimeZone.mockResolvedValue('Asia/Yekaterinburg');
            // Provide a window that covers the UTC instant we care about:
            // query date '2026-06-23' in +5 → UTC window [2026-06-22T19:00Z, 2026-06-23T19:00Z)
            const entryInstant = new Date('2026-06-22T20:00:00Z');
            mockScheduleRepository.find.mockResolvedValue([createMockEntry({}, entryInstant)]);

            const result = await service.getByDate('2026-06-23');

            expect(result).toHaveLength(1);
            expect(result[0]?.startTime).toBe('2026-06-22T20:00:00.000Z');
        });
    });
});
