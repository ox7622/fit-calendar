import type { Bot, Context } from 'grammy';

const WELCOME_MESSAGE =
    'Добро пожаловать в FitCalendar! 🏋️\n\n' + 'Я помогу вам следить за расписанием занятий и напомню о тренировках.';

const OPEN_APP_HINT = '\n\nОткройте приложение, чтобы посмотреть расписание:';

export function registerStartCommand(bot: Bot<Context>, miniAppUrl?: string): void {
    bot.command('start', async (ctx) => {
        if (miniAppUrl) {
            await ctx.reply(WELCOME_MESSAGE + OPEN_APP_HINT, {
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: '📅 Открыть расписание',
                                web_app: { url: miniAppUrl },
                            },
                        ],
                    ],
                },
            });
        } else {
            await ctx.reply(WELCOME_MESSAGE);
        }
    });
}
