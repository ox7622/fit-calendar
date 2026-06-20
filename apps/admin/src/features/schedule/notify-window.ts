/** Mirror of the API gate (apps/api/.../reminder/notify-window.ts) for modal copy. */
export const NOTIFY_WINDOW_DAYS = 5;

const WINDOW_MS = NOTIFY_WINDOW_DAYS * 24 * 60 * 60 * 1000;

/** Warning shown before an action that will push to every bot user. */
export const PUSH_WARNING = 'Занятие в ближайшие 5 дней. Все пользователи бота получат пуш-уведомление об этом.';

/** True when the ISO start time is between now and now + 5 days (inclusive). */
export function isWithinNotifyWindow(startTimeIso: string, now: Date = new Date()): boolean {
    const t = new Date(startTimeIso).getTime();
    if (Number.isNaN(t)) return false;
    return t >= now.getTime() && t <= now.getTime() + WINDOW_MS;
}
