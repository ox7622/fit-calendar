import { buildClubMessage } from '@fitcalendar/bot-core';
import type { Bot, Context } from 'grammy';

import type { ClubService } from '../../club/club.service';

/** Registers /club (contacts + working hours) on the (webhook) bot. */
export function registerClubCommand(bot: Bot<Context>, clubService: ClubService): void {
    bot.command('club', async (ctx) => {
        try {
            const club = await clubService.getInfo();
            await ctx.reply(buildClubMessage(club), { parse_mode: 'HTML' });
        } catch {
            await ctx.reply('Не удалось загрузить информацию о клубе. Попробуйте позже.');
        }
    });
}
