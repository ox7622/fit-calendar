export type DurationUnit = 'day' | 'week' | 'month';

const DAY_FORMS: [string, string, string] = ['день', 'дня', 'дней'];
const WEEK_FORMS: [string, string, string] = ['неделя', 'недели', 'недель'];
const MONTH_FORMS: [string, string, string] = ['месяц', 'месяца', 'месяцев'];

const UNIT_FORMS: Record<DurationUnit, [string, string, string]> = {
    day: DAY_FORMS,
    week: WEEK_FORMS,
    month: MONTH_FORMS,
};

/**
 * Picks the correct Russian noun form for `value`. Russian has three plural forms:
 * `one` (1, 21, 31, ...), `few` (2-4, 22-24, ...), `many` (0, 5-20, 25-30, ...).
 * Intl.PluralRules knows the categories but not the actual word forms,
 * so we keep a tiny rule table here.
 */
export function pluralize(value: number, [one, few, many]: [string, string, string]): string {
    const mod10 = value % 10;
    const mod100 = value % 100;
    if (mod10 === 1 && mod100 !== 11) return one;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
    return many;
}

/** `(12, 'month') → "12 месяцев"`, `(1, 'week') → "1 неделя"`. */
export function formatDuration(value: number, unit: DurationUnit): string {
    const forms = UNIT_FORMS[unit];
    return `${value} ${pluralize(value, forms)}`;
}

/** `30000 → "30 000 ₽"` — Russian currency formatting with non-breaking space thousands separator. */
export function formatPriceRub(rubles: number): string {
    const NBSP = ' ';
    const grouped = rubles.toString().replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
    return `${grouped}${NBSP}₽`;
}
