import { clampWeekOffset, MINI_APP_BUTTON_TEXT, WEEK_OFFSET_MAX, WEEK_OFFSET_MIN } from '@fitcalendar/shared';
import { InlineKeyboard } from 'grammy';

import { classLine, formatDayHeader, formatWeekRange } from './format';
import type { IWeekDay } from './types';

export interface WeekMessage {
    text: string;
    replyMarkup: InlineKeyboard;
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

    const keyboard = new InlineKeyboard();
    let hasNav = false;
    if (offset > WEEK_OFFSET_MIN) {
        keyboard.text('◀ Пред.', `week:${offset - 1}`);
        hasNav = true;
    }
    if (offset < WEEK_OFFSET_MAX) {
        keyboard.text('След. ▶', `week:${offset + 1}`);
        hasNav = true;
    }
    if (miniAppUrl) {
        if (hasNav) keyboard.row();
        keyboard.webApp(MINI_APP_BUTTON_TEXT, miniAppUrl);
    }

    return { text: `${header}\n\n${body}`, replyMarkup: keyboard };
}
