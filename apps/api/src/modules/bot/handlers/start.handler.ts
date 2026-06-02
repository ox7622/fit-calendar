import { MINI_APP_BUTTON_TEXT } from '@fitcalendar/shared';
import type { Bot, Context } from 'grammy';

import type { ClubService } from '../../club/club.service';

/** Builds the /start greeting, naming the club when we know it. */
export function buildWelcomeMessage(clubName: string | null): string {
    const who = clubName ? `клуба «${clubName}»` : 'фитнес-клуба';
    return (
        '<b>Привет! 👋</b>\n\n' +
        `Я бот ${who} — покажу расписание занятий, напомню о тренировках и сообщу об изменениях.\n\n` +
        'Команда /today покажет расписание на сегодня, а кнопка ниже откроет приложение с полным расписанием.'
    );
}

export function registerStartCommand(bot: Bot<Context>, clubService: ClubService, miniAppUrl?: string): void {
    bot.command('start', async (ctx) => {
        let clubName: string | null = null;
        try {
            clubName = (await clubService.getInfo()).name;
        } catch {
            // Greeting still works with the generic fallback if club info is unavailable.
        }

        await ctx.reply(buildWelcomeMessage(clubName), {
            parse_mode: 'HTML',
            reply_markup: miniAppUrl
                ? {
                      inline_keyboard: [[{ text: MINI_APP_BUTTON_TEXT, web_app: { url: miniAppUrl } }]],
                  }
                : undefined,
        });
    });
}
