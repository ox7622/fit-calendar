import { ScheduleEntry } from '@fitcalendar/db';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { AdminScheduleService } from '../admin-schedule.service';

type TQueryBuilderMock = {
    innerJoinAndSelect: jest.Mock;
    where: jest.Mock;
    andWhere: jest.Mock;
    orderBy: jest.Mock;
    skip: jest.Mock;
    take: jest.Mock;
    getManyAndCount: jest.Mock;
    _calls: { andWhere: Array<{ sql: string; params: Record<string, unknown> }>; skip: number; take: number };
};

function buildQueryBuilder(rows: ScheduleEntry[], total: number): TQueryBuilderMock {
    const _calls: TQueryBuilderMock['_calls'] = { andWhere: [], skip: 0, take: 0 };
    const qb = {
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn(function (this: TQueryBuilderMock, sql: string, params: Record<string, unknown>) {
            _calls.andWhere.push({ sql, params });
            return this;
        }),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn(function (this: TQueryBuilderMock, n: number) {
            _calls.skip = n;
            return this;
        }),
        take: jest.fn(function (this: TQueryBuilderMock, n: number) {
            _calls.take = n;
            return this;
        }),
        getManyAndCount: jest.fn().mockResolvedValue([rows, total]),
        _calls,
    } as unknown as TQueryBuilderMock;
    return qb;
}

const buildEntry = (overrides: Partial<ScheduleEntry> = {}): ScheduleEntry =>
    ({
        id: 'sched-1',
        startTime: new Date('2026-05-04T10:00:00Z'),
        durationMinutes: 60,
        status: 'scheduled',
        cancellationReason: null,
        coach: { id: 'c1', name: 'Мария', photoUrl: null },
        trainingType: { id: 't1', name: 'Йога', difficulty: 'beginner' },
        ...overrides,
    } as ScheduleEntry);

describe('AdminScheduleService', () => {
    let service: AdminScheduleService;
    let scheduleRepo: jest.Mocked<{ createQueryBuilder: jest.Mock }>;

    beforeEach(async () => {
        scheduleRepo = {
            createQueryBuilder: jest.fn(),
        } as unknown as jest.Mocked<{ createQueryBuilder: jest.Mock }>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [AdminScheduleService, { provide: getRepositoryToken(ScheduleEntry), useValue: scheduleRepo }],
        }).compile();

        service = module.get(AdminScheduleService);
    });

    it('returns paginated list with default pagination when no params given', async () => {
        const qb = buildQueryBuilder([buildEntry()], 1);
        scheduleRepo.createQueryBuilder.mockReturnValueOnce(qb);

        const result = await service.findAll({});

        expect(result.items).toHaveLength(1);
        expect(result.total).toBe(1);
        expect(result.page).toBe(1);
        expect(result.pageSize).toBe(50);
        expect(qb._calls.skip).toBe(0);
        expect(qb._calls.take).toBe(50);
    });

    it('applies coachId filter when provided', async () => {
        const qb = buildQueryBuilder([], 0);
        scheduleRepo.createQueryBuilder.mockReturnValueOnce(qb);

        await service.findAll({ coachId: 'coach-uuid' });

        const coachFilter = qb._calls.andWhere.find((c) => c.sql.includes('coachId'));
        expect(coachFilter).toBeDefined();
        expect(coachFilter?.params).toEqual({ coachId: 'coach-uuid' });
    });

    it('applies status filter when status is "cancelled" but skips it for "all"', async () => {
        const qbCancelled = buildQueryBuilder([], 0);
        scheduleRepo.createQueryBuilder.mockReturnValueOnce(qbCancelled);
        await service.findAll({ status: 'cancelled' });
        expect(qbCancelled._calls.andWhere.some((c) => c.sql.includes('status'))).toBe(true);

        const qbAll = buildQueryBuilder([], 0);
        scheduleRepo.createQueryBuilder.mockReturnValueOnce(qbAll);
        await service.findAll({ status: 'all' });
        expect(qbAll._calls.andWhere.some((c) => c.sql.includes('status'))).toBe(false);
    });

    it('caps pageSize at 200 even if a larger value is requested', async () => {
        const qb = buildQueryBuilder([], 0);
        scheduleRepo.createQueryBuilder.mockReturnValueOnce(qb);

        await service.findAll({ pageSize: 9999 });

        expect(qb._calls.take).toBe(200);
    });

    it('returns the unfiltered `total` from getManyAndCount (used for pagination UI)', async () => {
        const items = [buildEntry({ id: '1' }), buildEntry({ id: '2' })];
        const qb = buildQueryBuilder(items, 42);
        scheduleRepo.createQueryBuilder.mockReturnValueOnce(qb);

        const result = await service.findAll({ page: 1, pageSize: 2 });

        expect(result.items).toHaveLength(2);
        expect(result.total).toBe(42);
    });

    it('defaults range to start-of-week → +14 days when from/to omitted', async () => {
        const qb = buildQueryBuilder([], 0);
        scheduleRepo.createQueryBuilder.mockReturnValueOnce(qb);

        await service.findAll({});

        const rangeCall = (qb.where as jest.Mock).mock.calls[0];
        expect(rangeCall[0]).toContain('startTime BETWEEN');
        expect(rangeCall[1].from).toBeInstanceOf(Date);
        expect(rangeCall[1].to).toBeInstanceOf(Date);
        const fromTime = (rangeCall[1].from as Date).getTime();
        const toTime = (rangeCall[1].to as Date).getTime();
        // 14 days = 14 * 86400000 ms
        expect(toTime - fromTime).toBe(14 * 86_400_000);
    });
});
