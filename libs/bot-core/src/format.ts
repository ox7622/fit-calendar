import type { IClassEntry } from './types';

/** "12 июня 2026 г." style — full date for single-day headers. */
export function formatDateRu(date: Date): string {
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
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

/** UTC HH:MM from an ISO timestamp. */
export function formatTime(isoString: string): string {
    const date = new Date(isoString);
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
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

/** One schedule line, e.g. "⏰ 10:00 — Йога (Анна, 60мин)". */
export function classLine(cls: IClassEntry): string {
    const suffix = cls.status === 'cancelled' ? ' ❌ отменено' : '';
    return `⏰ ${formatTime(cls.startTime)} — ${cls.name} (${cls.coachName}, ${cls.durationMinutes}мин)${suffix}`;
}

/** YYYY-MM-DD for tomorrow in local time. */
export function tomorrowDateKey(): string {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const pad = (n: number): string => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
