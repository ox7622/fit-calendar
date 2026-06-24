import { buildWelcomeMessage } from '@fitcalendar/bot-core';
import { MINI_APP_BUTTON_TEXT } from '@fitcalendar/shared';
import type { Bot, Context } from 'grammy';

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
