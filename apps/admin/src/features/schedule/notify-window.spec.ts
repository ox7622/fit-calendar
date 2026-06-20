import { describe, expect, it } from 'vitest';

import { isWithinNotifyWindow } from './notify-window';

const now = new Date('2026-06-15T12:00:00Z');

describe('isWithinNotifyWindow (admin)', () => {
    it('true for a class tomorrow', () => {
        expect(isWithinNotifyWindow('2026-06-16T10:00:00Z', now)).toBe(true);
    });
    it('false for a class 15 days out', () => {
        expect(isWithinNotifyWindow('2026-06-30T10:00:00Z', now)).toBe(false);
    });
    it('false for a past class', () => {
        expect(isWithinNotifyWindow('2026-06-14T10:00:00Z', now)).toBe(false);
    });
    it('false for an invalid date string', () => {
        expect(isWithinNotifyWindow('not-a-date', now)).toBe(false);
    });
});
