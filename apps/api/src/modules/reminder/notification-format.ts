import { format, isSameDay } from 'date-fns';
import { ru } from 'date-fns/locale';

/** Escapes the HTML special characters Telegram's HTML parse mode cares about. */
export function escapeHtml(value: string): string {
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Renders a class start time in Russian: "Сегодня в HH:mm", "Завтра в HH:mm",
 * or "d MMMM в HH:mm". Shared by the reminder dispatcher and the schedule
 * notification listener so the wording stays in sync.
 */
export function formatTimingRu(startTime: Date, now: Date = new Date()): string {
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);

    const hhmm = format(startTime, 'HH:mm', { locale: ru });
    if (isSameDay(startTime, now)) return `Сегодня в ${hhmm}`;
    if (isSameDay(startTime, tomorrow)) return `Завтра в ${hhmm}`;
    return `${format(startTime, 'd MMMM', { locale: ru })} в ${hhmm}`;
}
