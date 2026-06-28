import type { Locale } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { ru } from 'date-fns/locale';

/**
 * Formats an instant (ISO string or Date) at the wall-clock time of `timeZone`,
 * using date-fns format tokens. Defaults to the Russian locale so month/weekday
 * names match the rest of the app. The single client-side primitive for showing
 * club-local class times regardless of the viewer's device timezone.
 */
export function formatInClubTz(instant: string | Date, timeZone: string, pattern: string, locale: Locale = ru): string {
    const date = typeof instant === 'string' ? new Date(instant) : instant;
    return formatInTimeZone(date, timeZone, pattern, { locale });
}
