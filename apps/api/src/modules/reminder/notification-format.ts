import { formatInClubTz } from '@fitcalendar/shared';

/** Escapes the HTML special characters Telegram's HTML parse mode cares about. */
export function escapeHtml(value: string): string {
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Renders a class start time in Russian club-local wording: "Сегодня в HH:mm",
 * "Завтра в HH:mm", or "d MMMM в HH:mm". `timeZone` is the club's IANA zone so
 * the wording matches what users see in the bot and apps. Shared by the reminder
 * dispatcher and the schedule notification listener.
 */
export function formatTimingRu(startTime: Date, timeZone: string, now: Date = new Date()): string {
    const dayKey = (d: Date): string => formatInClubTz(d, timeZone, 'yyyy-MM-dd');
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const hhmm = formatInClubTz(startTime, timeZone, 'HH:mm');
    const startKey = dayKey(startTime);
    if (startKey === dayKey(now)) return `Сегодня в ${hhmm}`;
    if (startKey === dayKey(tomorrow)) return `Завтра в ${hhmm}`;
    return `${formatInClubTz(startTime, timeZone, 'd MMMM')} в ${hhmm}`;
}
