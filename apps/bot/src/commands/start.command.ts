import type { Bot, Context } from 'grammy';

export function registerStartCommand(bot: Bot<Context>, miniAppUrl?: string): void {
    bot.command('start', async (ctx) => {
        const welcomeMessage =
            'Добро пожаловать в FitCalendar! 🏋️\n\n' +
            'Я помогу вам следить за расписанием занятий и напомню о тренировках.\n\n' +
            'Откройте приложение, чтобы посмотреть расписание:';

        if (miniAppUrl) {
            await ctx.reply(welcomeMessage, {
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
            await ctx.reply(
                'Добро пожаловать в FitCalendar! 🏋️\n\n' +
                    'Я помогу вам следить за расписанием занятий и напомню о тренировках.',
            );
        }
    });
}
