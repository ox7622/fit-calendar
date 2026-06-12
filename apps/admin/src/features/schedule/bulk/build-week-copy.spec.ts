import type { IAdminScheduleItem } from '@/shared/api';
import { describe, expect, it } from 'vitest';

import { buildWeekCopy } from './build-week-copy';

const item = (over: Partial<IAdminScheduleItem>): IAdminScheduleItem => ({
    id: 'x',
    startTime: '2026-06-08T15:00:00.000Z',
    durationMinutes: 60,
    status: 'scheduled',
    cancellationReason: null,
    trainingType: { id: 't1', name: 'Йога', difficulty: 'beginner' },
    coach: { id: 'c1', name: 'Мария', photoUrl: null },
    ...over,
});

describe('buildWeekCopy', () => {
    const sourceWeek = new Date(2026, 5, 8); // Mon 2026-06-08
    const targetWeek = new Date(2026, 5, 15); // Mon 2026-06-15 (+1 week)

    it('shifts each scheduled item by the whole-week delta, preserving weekday and time', () => {
        const src = [item({ id: 'a', startTime: '2026-06-08T15:00:00.000Z' })];
        const result = buildWeekCopy(src, sourceWeek, targetWeek);
        expect(result).toHaveLength(1);
        const d = new Date(result[0].startTime);
        expect(d.getDate()).toBe(15); // +7 days
        expect(d.getHours()).toBe(new Date('2026-06-08T15:00:00.000Z').getHours());
        expect(result[0]).toMatchObject({ trainingTypeId: 't1', coachId: 'c1', durationMinutes: 60 });
    });

    it('skips cancelled classes', () => {
        const src = [item({ id: 'a' }), item({ id: 'b', status: 'cancelled' })];
        expect(buildWeekCopy(src, sourceWeek, targetWeek)).toHaveLength(1);
    });
});
