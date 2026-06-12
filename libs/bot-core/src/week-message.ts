import { clampWeekOffset, MINI_APP_BUTTON_TEXT, WEEK_OFFSET_MAX, WEEK_OFFSET_MIN } from '@fitcalendar/shared';

import { classLine, formatDayHeader, formatWeekRange } from './format';
import type { IWeekDay } from './types';

interface InlineButton {
    text: string;
    callback_data?: string;
    web_app?: { url: string };
}

export interface WeekMessage {
    text: string;
    replyMarkup: { inline_keyboard: InlineButton[][] };
}

/** Build the text + inline keyboard for one week of schedule. */
export function buildWeekMessage(days: IWeekDay[], weekOffset: number, miniAppUrl?: string): WeekMessage {
    const offset = clampWeekOffset(weekOffset);

    const startISO = days[0]?.date ?? '';
    const endISO = days[days.length - 1]?.date ?? startISO;
    const header = `📅 Неделя ${formatWeekRange(startISO, endISO)}`;

    const blocks = days
        .filter((day) => day.classes.length > 0)
        .map((day) => `— ${formatDayHeader(day.date)} —\n${day.classes.map(classLine).join('\n')}`);
    const body = blocks.length > 0 ? blocks.join('\n\n') : 'На этой неделе занятий нет 😴';

    const navRow: InlineButton[] = [];
    if (offset > WEEK_OFFSET_MIN) navRow.push({ text: '◀ Пред.', callback_data: `week:${offset - 1}` });
    if (offset < WEEK_OFFSET_MAX) navRow.push({ text: 'След. ▶', callback_data: `week:${offset + 1}` });

    const rows: InlineButton[][] = [];
    if (navRow.length > 0) rows.push(navRow);
    if (miniAppUrl) rows.push([{ text: MINI_APP_BUTTON_TEXT, web_app: { url: miniAppUrl } }]);

    return { text: `${header}\n\n${body}`, replyMarkup: { inline_keyboard: rows } };
}
