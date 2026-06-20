import type { IAdminScheduleItem } from '@/shared/api';
import { describe, expect, it } from 'vitest';

import { buildDuplicate } from './build-duplicate';

const source: IAdminScheduleItem = {
    id: 'x',
    startTime: '2026-06-08T15:00:00.000Z',
    durationMinutes: 45,
    status: 'scheduled',
    cancellationReason: null,
    trainingType: { id: 't1', name: 'Йога', difficulty: 'beginner' },
    coach: { id: 'c1', name: 'Мария', photoUrl: null },
};

describe('buildDuplicate', () => {
    it('copies the class to each target date, keeping its time of day', () => {
        const result = buildDuplicate(source, [new Date(2026, 5, 10), new Date(2026, 5, 12)]);
        expect(result).toHaveLength(2);
        for (const e of result) {
            expect(e).toMatchObject({ trainingTypeId: 't1', coachId: 'c1', durationMinutes: 45 });
            const d = new Date(e.startTime);
            expect(d.getHours()).toBe(new Date('2026-06-08T15:00:00.000Z').getHours());
            expect(d.getMinutes()).toBe(0);
        }
        expect(new Date(result[0].startTime).getDate()).toBe(10);
        expect(new Date(result[1].startTime).getDate()).toBe(12);
    });
});
