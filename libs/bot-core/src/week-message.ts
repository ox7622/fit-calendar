import { MINI_APP_BUTTON_TEXT, WEEK_OFFSET_MAX, WEEK_OFFSET_MIN } from '@fitcalendar/shared';
import { InlineKeyboard } from 'grammy';

import { classLine, formatDayHeader, formatWeekRange } from './format';
import type { IWeekDay } from './types';

export interface WeekMessage {
    text: string;
    replyMarkup: InlineKeyboard;
}

/**
 * Build the text + inline keyboard for one week of schedule. `offset` is expected
 * to be pre-clamped by the caller (the command/callback entry points); this is a
 * pure formatter and does not re-validate it.
 */
export function buildWeekMessage(days: IWeekDay[], offset: number, timeZone: string, miniAppUrl?: string): WeekMessage {
    const startISO = days[0]?.date ?? '';
    const endISO = days[days.length - 1]?.date ?? startISO;
    const header = `<b>Неделя ${formatWeekRange(startISO, endISO)}</b>`;

    const blocks = days
        .filter((day) => day.classes.length > 0)
        .map(
            (day) =>
                `<b>${formatDayHeader(day.date)}</b>\n${day.classes.map((c) => classLine(c, timeZone)).join('\n')}`,
        );
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
