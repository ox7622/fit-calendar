import { buildWelcomeMessage } from '@fitcalendar/bot-core';
import { MINI_APP_BUTTON_TEXT } from '@fitcalendar/shared';
import type { Bot, Context } from 'grammy';

import type { ClubService } from '../../club/club.service';

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
