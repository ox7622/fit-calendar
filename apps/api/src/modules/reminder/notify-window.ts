import { NOTIFY_WINDOW_DAYS } from '@fitcalendar/shared';

export { NOTIFY_WINDOW_DAYS };

const WINDOW_MS = NOTIFY_WINDOW_DAYS * 24 * 60 * 60 * 1000;

/**
 * True when `startTime` is between now and now + NOTIFY_WINDOW_DAYS (inclusive).
 * Past classes return false — we never push about something that already happened.
 * Authoritative server-side gate; the admin UI mirrors this only for modal copy.
 */
export function isWithinNotifyWindow(startTime: Date, now: Date): boolean {
    const t = startTime.getTime();
    return t >= now.getTime() && t <= now.getTime() + WINDOW_MS;
}
