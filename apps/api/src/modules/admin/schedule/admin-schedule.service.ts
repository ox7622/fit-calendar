import { ScheduleEntry } from '@fitcalendar/db';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { addDays, startOfWeek } from 'date-fns';
import { Between, Repository } from 'typeorm';

import { AdminScheduleListResponseDto, toAdminScheduleItem } from './dto/admin-schedule-list.dto';
import { AdminScheduleQueryDto } from './dto/admin-schedule-query.dto';

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;
const DEFAULT_RANGE_DAYS = 14;

@Injectable()
export class AdminScheduleService {
    private readonly logger = new Logger(AdminScheduleService.name);

    constructor(
        @InjectRepository(ScheduleEntry)
        private readonly scheduleRepo: Repository<ScheduleEntry>,
    ) {}

    async findAll(query: AdminScheduleQueryDto): Promise<AdminScheduleListResponseDto> {
        const { from, to } = this.resolveRange(query);
        const page = Math.max(1, query.page ?? 1);
        const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, query.pageSize ?? DEFAULT_PAGE_SIZE));

        const qb = this.scheduleRepo
            .createQueryBuilder('e')
            .innerJoinAndSelect('e.coach', 'c')
            .innerJoinAndSelect('e.trainingType', 't')
            .where('e.startTime BETWEEN :from AND :to', { from, to });

        if (query.coachId) {
            qb.andWhere('e.coachId = :coachId', { coachId: query.coachId });
        }
        if (query.trainingTypeId) {
            qb.andWhere('e.trainingTypeId = :trainingTypeId', { trainingTypeId: query.trainingTypeId });
        }
        if (query.status && query.status !== 'all') {
            qb.andWhere('e.status = :status', { status: query.status });
        }

        qb.orderBy('e.startTime', 'ASC')
            .skip((page - 1) * pageSize)
            .take(pageSize);

        const [items, total] = await qb.getManyAndCount();

        return {
            items: items.map(toAdminScheduleItem),
            total,
            page,
            pageSize,
        };
    }

    private resolveRange(query: AdminScheduleQueryDto): { from: Date; to: Date } {
        // Default: this week Monday → +14 days. Russian week starts Monday
        // (weekStartsOn: 1) — matches the front-end-spec convention.
        const now = new Date();
        const from = query.from ? new Date(query.from) : startOfWeek(now, { weekStartsOn: 1 });
        const to = query.to ? new Date(query.to) : addDays(from, DEFAULT_RANGE_DAYS);
        return { from, to };
    }

    /**
     * Convenience for callers that need a single entry within a known range
     * already produced by `findAll`. Used by the Between predicate in tests.
     * Reuses the same row shape returned by `findAll`.
     */
    static buildBetween(from: Date, to: Date): ReturnType<typeof Between<Date>> {
        return Between(from, to);
    }
}
