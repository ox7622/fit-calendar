import { MINI_APP_BUTTON_TEXT } from '@fitcalendar/shared';
import type { Bot, Context } from 'grammy';
import { InlineKeyboard } from 'grammy';

const FALLBACK_MESSAGE =
    'Я понимаю только команды 🙂\n\n' +
    '/today — расписание на сегодня\n' +
    '/tomorrow — расписание на завтра\n' +
    '/week — расписание на неделю\n' +
    '/club — контакты и часы работы\n\n' +
    'Открой приложение с полным расписанием кнопкой ниже 👇';

/**
 * Registers a catch-all handler for plain text the bot doesn't recognize as a
 * command. grammy stops once a `bot.command(...)` matches, so this only fires
 * for free-form text and unknown commands — register it AFTER all commands.
 */
export function registerFallbackHandler(bot: Bot<Context>, miniAppUrl?: string): void {
    const markup = miniAppUrl ? new InlineKeyboard().webApp(MINI_APP_BUTTON_TEXT, miniAppUrl) : undefined;

    bot.on('message:text', async (ctx) => {
        await ctx.reply(FALLBACK_MESSAGE, markup ? { reply_markup: markup } : undefined);
    });
}
