import { describe, expect, it } from 'vitest';

import { buildRecurrence } from './build-recurrence';

const base = { trainingTypeId: 't1', coachId: 'c1', durationMinutes: 60, time: '18:30' };

describe('buildRecurrence', () => {
    it('creates one entry per matching weekday inside a date range (inclusive)', () => {
        // 2026-06-08 (Mon) … 2026-06-21 (Sun): Mon/Wed/Fri over two weeks = 6 entries.
        const result = buildRecurrence({
            ...base,
            weekdays: [1, 3, 5],
            range: { mode: 'dates', from: new Date(2026, 5, 8), to: new Date(2026, 5, 21) },
        });
        expect(result).toHaveLength(6);
        for (const e of result) {
            expect(e).toMatchObject({ trainingTypeId: 't1', coachId: 'c1', durationMinutes: 60 });
            const d = new Date(e.startTime);
            expect(d.getHours()).toBe(18);
            expect(d.getMinutes()).toBe(30);
            expect([1, 3, 5]).toContain(((d.getDay() + 6) % 7) + 1);
        }
    });

    it('supports "N weeks" mode: from a start date for N*7 days', () => {
        const result = buildRecurrence({
            ...base,
            weekdays: [1, 3, 5],
            range: { mode: 'weeks', from: new Date(2026, 5, 8), weeks: 2 },
        });
        expect(result).toHaveLength(6);
    });

    it('returns empty when no weekday matches', () => {
        const result = buildRecurrence({
            ...base,
            weekdays: [7], // Sunday only
            range: { mode: 'dates', from: new Date(2026, 5, 8), to: new Date(2026, 5, 10) }, // Mon–Wed
        });
        expect(result).toEqual([]);
    });
});
