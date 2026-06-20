import { WEEK_OFFSET_MIN, WEEK_OFFSET_MAX, clampWeekOffset } from './bot.const';

describe('week offset', () => {
    it('exposes the navigable range', () => {
        expect(WEEK_OFFSET_MIN).toBe(-4);
        expect(WEEK_OFFSET_MAX).toBe(8);
    });

    it('clamps below the minimum', () => {
        expect(clampWeekOffset(-10)).toBe(-4);
    });

    it('clamps above the maximum', () => {
        expect(clampWeekOffset(99)).toBe(8);
    });

    it('passes values inside the range through', () => {
        expect(clampWeekOffset(0)).toBe(0);
        expect(clampWeekOffset(3)).toBe(3);
    });

    it('floors non-integers and defaults NaN to 0', () => {
        expect(clampWeekOffset(2.9)).toBe(2);
        expect(clampWeekOffset(Number.NaN)).toBe(0);
    });
});
