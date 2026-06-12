import { MINI_APP_BUTTON_TEXT } from '@fitcalendar/shared';

import type { IWeekDay } from '../types';
import { buildWeekMessage } from '../week-message';

const week: IWeekDay[] = [
    {
        date: '2026-06-12',
        classes: [
            {
                name: 'Йога',
                startTime: '2026-06-12T10:00:00.000Z',
                durationMinutes: 60,
                status: 'scheduled',
                coachName: 'Анна',
            },
        ],
    },
    { date: '2026-06-13', classes: [] },
    { date: '2026-06-14', classes: [] },
    { date: '2026-06-15', classes: [] },
    { date: '2026-06-16', classes: [] },
    { date: '2026-06-17', classes: [] },
    { date: '2026-06-18', classes: [] },
];

const emptyWeek: IWeekDay[] = week.map((d) => ({ ...d, classes: [] }));

describe('buildWeekMessage', () => {
    it('puts a range header on top and lists only non-empty days', () => {
        const { text } = buildWeekMessage(week, 0);
        expect(text.startsWith('📅 Неделя 12–18 июня')).toBe(true);
        expect(text).toContain('Пятница, 12 июня');
        expect(text).toContain('⏰ 10:00 — Йога');
        expect(text).not.toContain('Суббота'); // empty day omitted
    });

    it('shows the empty-week message but keeps nav buttons', () => {
        const { text, replyMarkup } = buildWeekMessage(emptyWeek, 0);
        expect(text).toContain('На этой неделе занятий нет 😴');
        const labels = replyMarkup.inline_keyboard.flat().map((b) => (b as { text: string }).text);
        expect(labels).toContain('След. ▶');
    });

    it('hides the back arrow at the lower bound', () => {
        const { replyMarkup } = buildWeekMessage(week, -4);
        const labels = replyMarkup.inline_keyboard.flat().map((b) => (b as { text: string }).text);
        expect(labels).not.toContain('◀ Пред.');
        expect(labels).toContain('След. ▶');
    });

    it('hides the forward arrow at the upper bound', () => {
        const { replyMarkup } = buildWeekMessage(week, 8);
        const labels = replyMarkup.inline_keyboard.flat().map((b) => (b as { text: string }).text);
        expect(labels).toContain('◀ Пред.');
        expect(labels).not.toContain('След. ▶');
    });

    it('encodes target offsets in callback_data', () => {
        const { replyMarkup } = buildWeekMessage(week, 2);
        const nav = replyMarkup.inline_keyboard[0] as Array<{ text: string; callback_data: string }>;
        expect(nav.find((b) => b.text === '◀ Пред.')?.callback_data).toBe('week:1');
        expect(nav.find((b) => b.text === 'След. ▶')?.callback_data).toBe('week:3');
    });

    it('appends the mini-app button when a URL is given', () => {
        const { replyMarkup } = buildWeekMessage(week, 0, 'https://app.example.com');
        const lastRow = replyMarkup.inline_keyboard[replyMarkup.inline_keyboard.length - 1];
        expect(lastRow[0]).toMatchObject({ text: MINI_APP_BUTTON_TEXT, web_app: { url: 'https://app.example.com' } });
    });
});
