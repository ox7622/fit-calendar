import type { TDurationUnit } from '@fitcalendar/db';

const DAY_FORMS: [string, string, string] = ['день', 'дня', 'дней'];
const WEEK_FORMS: [string, string, string] = ['неделя', 'недели', 'недель'];
const MONTH_FORMS: [string, string, string] = ['месяц', 'месяца', 'месяцев'];

const UNIT_FORMS: Record<TDurationUnit, [string, string, string]> = {
    day: DAY_FORMS,
    week: WEEK_FORMS,
    month: MONTH_FORMS,
};

// Mirror of apps/mini-app/src/shared/utils/formatRussian.ts. Kept duplicated
// because the mini-app cannot import from libs/shared without dragging
// @nestjs/common into its bundle (status-codes.const.ts re-exports HttpStatus).
function pluralize(value: number, [one, few, many]: [string, string, string]): string {
    const mod10 = value % 10;
    const mod100 = value % 100;
    if (mod10 === 1 && mod100 !== 11) return one;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
    return many;
}

export function formatDuration(value: number, unit: TDurationUnit): string {
    return `${value} ${pluralize(value, UNIT_FORMS[unit])}`;
}
