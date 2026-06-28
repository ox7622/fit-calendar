import { formatInClubTz } from '@fitcalendar/shared';

import type { IClassEntry } from './types';

/** Escape the three characters that matter for Telegram HTML message text. */
export function escapeHtml(value: string): string {
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** "30 мая" — day + genitive month in the club zone, no weekday, no year. For day headers. */
export function formatDayMonth(date: Date, timeZone: string): string {
    return formatInClubTz(date, timeZone, 'd MMMM');
}

/** "Пятница, 12 июня" from a YYYY-MM-DD key. */
export function formatDayHeader(isoDate: string): string {
    const label = new Date(`${isoDate}T00:00:00`).toLocaleDateString('ru-RU', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
    });
    return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Club-local HH:MM from an ISO timestamp, in the given IANA timeZone. */
export function formatTime(isoString: string, timeZone: string): string {
    return formatInClubTz(isoString, timeZone, 'HH:mm');
}

/** "12–18 июня" within a month, or "30 июня – 6 июля" across a boundary. */
export function formatWeekRange(startISO: string, endISO: string): string {
    const start = new Date(`${startISO}T00:00:00`);
    const end = new Date(`${endISO}T00:00:00`);
    // Derive the genitive month name ("июня", not nominative "июнь") by formatting
    // day + month together and stripping the leading day number.
    const monthOf = (d: Date): string =>
        d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }).replace(/^\d+\s+/, '');
    const startMonth = monthOf(start);
    const endMonth = monthOf(end);
    if (startMonth === endMonth) {
        return `${start.getDate()}–${end.getDate()} ${endMonth}`;
    }
    return `${start.getDate()} ${startMonth} – ${end.getDate()} ${endMonth}`;
}

/**
 * One schedule line as Telegram HTML. Active: monospace time + name · coach,
 * e.g. "<code>10:00</code>  Йога · Анна". Cancelled classes are struck through
 * and drop the coach. The monospace time renders teal-tinted in dark themes.
 */
export function classLine(cls: IClassEntry, timeZone: string): string {
    const time = `<code>${formatTime(cls.startTime, timeZone)}</code>`;
    if (cls.status === 'cancelled') {
        return `<s>${time}  ${escapeHtml(cls.name)}</s>`;
    }
    return `${time}  ${escapeHtml(cls.name)} · ${escapeHtml(cls.coachName)}`;
}

/** YYYY-MM-DD for tomorrow in the club zone. (Russia has no DST, so now+24h is safe.) */
export function tomorrowDateKey(timeZone: string): string {
    return formatInClubTz(new Date(Date.now() + 24 * 60 * 60 * 1000), timeZone, 'yyyy-MM-dd');
}
