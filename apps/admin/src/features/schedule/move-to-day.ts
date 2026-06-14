/**
 * Apply `target`'s calendar date (year/month/day) to `iso`, preserving its
 * local time-of-day, and return the result as an ISO string. `setFullYear`
 * operates in local time, so the wall-clock hour/minute are unchanged across
 * the swap. Used by the calendar's drag-and-drop move (day-level only).
 */
export function moveToDay(iso: string, target: Date): string {
    const result = new Date(iso);
    result.setFullYear(target.getFullYear(), target.getMonth(), target.getDate());
    return result.toISOString();
}
