import { clampWeekOffset, MINI_APP_BUTTON_TEXT } from '@fitcalendar/shared';
import type { Bot, Context } from 'grammy';
import { InlineKeyboard } from 'grammy';

import { classLine, formatDayMonth, tomorrowDateKey } from './format';
import type { IClassEntry, ScheduleDataSource } from './types';
import { buildWeekMessage } from './week-message';

const LOAD_ERROR = 'Не удалось загрузить расписание. Попробуйте позже.';

function miniAppKeyboard(miniAppUrl?: string): InlineKeyboard | undefined {
    return miniAppUrl ? new InlineKeyboard().webApp(MINI_APP_BUTTON_TEXT, miniAppUrl) : undefined;
}

/**
 * Registers /today, /tomorrow, /week and the week:* navigation callback on a bot,
 * driven by a ScheduleDataSource. Shared by the standalone and webhook bots.
 */
export function registerScheduleCommands(bot: Bot<Context>, dataSource: ScheduleDataSource, miniAppUrl?: string): void {
    const dayMarkup = miniAppKeyboard(miniAppUrl);

    const replyForDay = async (
        ctx: Context,
        classes: IClassEntry[],
        header: string,
        emptyText: string,
    ): Promise<void> => {
        const body = classes.length === 0 ? emptyText : classes.map(classLine).join('\n');
        await ctx.reply(`${header}\n\n${body}`, {
            parse_mode: 'HTML',
            ...(dayMarkup ? { reply_markup: dayMarkup } : {}),
        });
    };

    bot.command('today', async (ctx) => {
        try {
            const classes = await dataSource.getToday();
            await replyForDay(
                ctx,
                classes,
                `<b>Расписание на сегодня, ${formatDayMonth(new Date())}</b>`,
                'Сегодня занятий нет 😴',
            );
        } catch {
            await ctx.reply(LOAD_ERROR);
        }
    });

    bot.command('tomorrow', async (ctx) => {
        try {
            const dateKey = tomorrowDateKey();
            const classes = await dataSource.getByDate(dateKey);
            await replyForDay(
                ctx,
                classes,
                `<b>Расписание на завтра, ${formatDayMonth(new Date(`${dateKey}T00:00:00`))}</b>`,
                'Завтра занятий нет 😴',
            );
        } catch {
            await ctx.reply(LOAD_ERROR);
        }
    });

    bot.command('week', async (ctx) => {
        try {
            const days = await dataSource.getWeek(0);
            const { text, replyMarkup } = buildWeekMessage(days, 0, miniAppUrl);
            await ctx.reply(text, { reply_markup: replyMarkup, parse_mode: 'HTML' });
        } catch {
            await ctx.reply(LOAD_ERROR);
        }
    });

    bot.callbackQuery(/^week:(-?\d+)$/, async (ctx) => {
        const target = clampWeekOffset(Number.parseInt(ctx.match[1] ?? '', 10));
        let message;
        try {
            const days = await dataSource.getWeek(target);
            message = buildWeekMessage(days, target, miniAppUrl);
        } catch {
            await ctx.answerCallbackQuery({ text: 'Не удалось загрузить расписание' });
            return;
        }
        try {
            await ctx.editMessageText(message.text, { reply_markup: message.replyMarkup, parse_mode: 'HTML' });
        } catch {
            // "message is not modified" / stale message — safe to ignore.
        }
        await ctx.answerCallbackQuery();
    });
}
