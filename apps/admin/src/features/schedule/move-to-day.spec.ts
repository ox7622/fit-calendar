import { describe, expect, it } from 'vitest';

import { moveToDay } from './move-to-day';

/**
 * moveToDay keeps the local time-of-day of `iso` and swaps only the calendar
 * date to `target`'s date. We assert on the local wall-clock parts of the
 * result (not the raw ISO string) so the test is timezone-independent.
 */
function localParts(iso: string) {
    const d = new Date(iso);
    return {
        y: d.getFullYear(),
        m: d.getMonth(),
        day: d.getDate(),
        h: d.getHours(),
        min: d.getMinutes(),
    };
}

describe('moveToDay', () => {
    it('swaps the date but keeps the time of day', () => {
        const source = new Date(2026, 5, 15, 9, 30, 0, 0).toISOString(); // Mon 15 Jun 09:30 local
        const target = new Date(2026, 5, 17, 0, 0, 0, 0); // Wed 17 Jun
        const result = localParts(moveToDay(source, target));
        expect(result).toEqual({ y: 2026, m: 5, day: 17, h: 9, min: 30 });
    });

    it('returns the same instant when target is the same day', () => {
        const source = new Date(2026, 5, 15, 9, 30).toISOString();
        const target = new Date(2026, 5, 15, 0, 0);
        expect(moveToDay(source, target)).toBe(source);
    });

    it('handles month/year boundaries', () => {
        const source = new Date(2026, 11, 31, 18, 0).toISOString(); // 31 Dec 18:00
        const target = new Date(2027, 0, 1, 0, 0); // 1 Jan 2027
        const result = localParts(moveToDay(source, target));
        expect(result).toEqual({ y: 2027, m: 0, day: 1, h: 18, min: 0 });
    });
});
