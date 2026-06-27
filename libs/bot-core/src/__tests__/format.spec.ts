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
        expect(formatTime('2026-06-12T10:05:00.000Z', 'Europe/Moscow')).toBe('13:05');
    });

    it('renders club-local (Asia/Yekaterinburg, +5) HH:MM', () => {
        expect(formatTime('2026-06-12T10:05:00.000Z', 'Asia/Yekaterinburg')).toBe('15:05');
    });
});

describe('formatDayHeader', () => {
    it('capitalises a Russian weekday + day + month', () => {
        expect(formatDayHeader('2026-06-12')).toBe('Пятница, 12 июня');
    });
});

describe('formatDayMonth', () => {
    it('renders day + genitive month in the club zone, no weekday and no year', () => {
        expect(formatDayMonth(new Date('2026-06-12T09:00:00Z'), 'Europe/Moscow')).toBe('12 июня');
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
        expect(classLine(base, 'Europe/Moscow')).toBe('<code>13:00</code>  Йога · Анна');
    });

    it('strikes cancelled classes and drops the coach', () => {
        expect(classLine({ ...base, status: 'cancelled' }, 'Europe/Moscow')).toBe('<s><code>13:00</code>  Йога</s>');
    });

    it('escapes HTML-significant characters in name and coach', () => {
        expect(classLine({ ...base, name: 'A & B', coachName: '<X>' }, 'Europe/Moscow')).toBe(
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
        expect(tomorrowDateKey('Europe/Moscow')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
});
