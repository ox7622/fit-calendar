import {
    classLine,
    escapeHtml,
    formatDayHeader,
    formatDayMonth,
    formatTime,
    formatWeekRange,
    tomorrowDateKey,
} from '../format';
import type { IClassEntry } from '../types';

describe('formatTime', () => {
    it('renders club-local (Europe/Moscow, +3) HH:MM', () => {
        expect(formatTime('2026-06-12T10:05:00.000Z')).toBe('13:05');
    });
});

describe('formatDayHeader', () => {
    it('capitalises a Russian weekday + day + month', () => {
        expect(formatDayHeader('2026-06-12')).toBe('Пятница, 12 июня');
    });
});

describe('formatDayMonth', () => {
    it('renders day + genitive month, no weekday and no year', () => {
        expect(formatDayMonth(new Date('2026-06-12T12:00:00'))).toBe('12 июня');
    });
});

describe('escapeHtml', () => {
    it('escapes the three HTML-significant characters', () => {
        expect(escapeHtml('A & <b> "x"')).toBe('A &amp; &lt;b&gt; "x"');
    });
});

describe('classLine', () => {
    const base: IClassEntry = {
        name: 'Йога',
        startTime: '2026-06-12T10:00:00.000Z',
        durationMinutes: 60,
        status: 'scheduled',
        coachName: 'Анна',
    };

    it('renders a scheduled class as monospace time + name · coach (Europe/Moscow)', () => {
        expect(classLine(base)).toBe('<code>13:00</code>  Йога · Анна');
    });

    it('strikes cancelled classes and drops the coach', () => {
        expect(classLine({ ...base, status: 'cancelled' })).toBe('<s><code>13:00</code>  Йога</s>');
    });

    it('escapes HTML-significant characters in name and coach', () => {
        expect(classLine({ ...base, name: 'A & B', coachName: '<X>' })).toBe(
            '<code>13:00</code>  A &amp; B · &lt;X&gt;',
        );
    });
});

describe('formatWeekRange', () => {
    it('collapses the month within one month', () => {
        expect(formatWeekRange('2026-06-12', '2026-06-18')).toBe('12–18 июня');
    });

    it('shows both months across a boundary', () => {
        expect(formatWeekRange('2026-06-30', '2026-07-06')).toBe('30 июня – 6 июля');
    });
});

describe('tomorrowDateKey', () => {
    it('returns a YYYY-MM-DD string one day ahead', () => {
        const key = tomorrowDateKey();
        expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        const expected = new Date();
        expected.setDate(expected.getDate() + 1);
        const pad = (n: number) => String(n).padStart(2, '0');
        expect(key).toBe(`${expected.getFullYear()}-${pad(expected.getMonth() + 1)}-${pad(expected.getDate())}`);
    });
});
