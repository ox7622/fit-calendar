/**
 * Label for the inline button that launches the Telegram Mini App from bot
 * messages (/start, /today, /tomorrow, /week). The app is more than a schedule,
 * so the wording is intentionally generic.
 */
export const MINI_APP_BUTTON_TEXT = 'Открыть в приложении →';

/** Furthest week the bot lets users page back to (weeks from the current one). */
export const WEEK_OFFSET_MIN = -4;
/** Furthest week the bot lets users page forward to. */
export const WEEK_OFFSET_MAX = 8;

/** Clamp an arbitrary week offset into the navigable range; NaN → 0. */
export function clampWeekOffset(offset: number): number {
    if (Number.isNaN(offset)) return 0;
    const floored = Math.trunc(offset);
    return Math.min(WEEK_OFFSET_MAX, Math.max(WEEK_OFFSET_MIN, floored));
}
