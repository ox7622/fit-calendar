import { isWithinNotifyWindow, NOTIFY_WINDOW_DAYS } from '../notify-window';

describe('isWithinNotifyWindow', () => {
    const now = new Date('2026-06-15T12:00:00Z');

    it('is true for a class later today', () => {
        expect(isWithinNotifyWindow(new Date('2026-06-15T18:00:00Z'), now)).toBe(true);
    });

    it('is true on the far edge (exactly +5 days)', () => {
        const edge = new Date(now.getTime() + NOTIFY_WINDOW_DAYS * 24 * 60 * 60 * 1000);
        expect(isWithinNotifyWindow(edge, now)).toBe(true);
    });

    it('is false past the window (+5 days and 1 minute)', () => {
        const past = new Date(now.getTime() + NOTIFY_WINDOW_DAYS * 24 * 60 * 60 * 1000 + 60_000);
        expect(isWithinNotifyWindow(past, now)).toBe(false);
    });

    it('is false for a class already in the past', () => {
        expect(isWithinNotifyWindow(new Date('2026-06-15T11:59:00Z'), now)).toBe(false);
    });
});
