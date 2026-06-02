import { MINI_APP_BUTTON_TEXT } from '@fitcalendar/shared';
import type { Bot, Context } from 'grammy';

/** Builds the /start greeting, naming the club when we know it. */
function buildWelcomeMessage(clubName: string | null): string {
    const who = clubName ? `клуба «${clubName}»` : 'фитнес-клуба';
    return (
        '<b>Привет! 👋</b>\n\n' +
        `Я бот ${who} — покажу расписание занятий, напомню о тренировках и сообщу об изменениях.\n\n` +
        'Команда /today покажет расписание на сегодня, а кнопка ниже откроет приложение с полным расписанием.'
    );
}

/** Fetches the club name from the API; returns null so the greeting can fall back. */
async function fetchClubName(): Promise<string | null> {
    const apiUrl = process.env['API_URL'];
    if (!apiUrl) return null;
    try {
        const response = await fetch(`${apiUrl}/api/club-info`);
        if (!response.ok) return null;
        const data = (await response.json()) as { name?: string };
        return data.name ?? null;
    } catch {
        return null;
    }
}

export function registerStartCommand(bot: Bot<Context>, miniAppUrl?: string): void {
    bot.command('start', async (ctx) => {
        const clubName = await fetchClubName();

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
