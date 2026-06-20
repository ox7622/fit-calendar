/**
 * YYYY-MM-DD string utilities shared across admin features.
 *
 * Working with ISO date strings (not Date objects) keeps comparisons
 * lexicographic and timezone-agnostic — what the admin sees in `<input type="date">`
 * matches exactly what the backend stores in `date` columns.
 */

function pad(n: number): string {
    return String(n).padStart(2, '0');
}

export function todayIso(): string {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function addDaysIso(iso: string, days: number): string {
    const parts = iso.split('-').map(Number);
    const y = parts[0] ?? 0;
    const m = parts[1] ?? 1;
    const d = parts[2] ?? 1;
    const dt = new Date(Date.UTC(y, m - 1, d + days));
    return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

/** YYYY-MM-DD → DD.MM.YYYY for Russian display. */
export function fmtDate(iso: string): string {
    const [y, m, d] = iso.split('-');
    return `${d}.${m}.${y}`;
}

/**
 * Given a set of YYYY-MM-DD end dates, suggest the day after the latest one,
 * clamped to today. Used to pre-fill "start date" inputs (next freeze after
 * the last freeze ends, next plan after the active one expires).
 */
export function nextStartAfter(endDates: string[]): string {
    const today = todayIso();
    if (endDates.length === 0) return today;
    const latest = endDates.reduce((a, b) => (b > a ? b : a));
    const dayAfter = addDaysIso(latest, 1);
    return dayAfter > today ? dayAfter : today;
}
