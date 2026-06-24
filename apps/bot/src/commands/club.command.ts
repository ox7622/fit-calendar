import { buildClubMessage, type IClubInfo } from '@fitcalendar/bot-core';
import type { Bot, Context } from 'grammy';

/** Registers /club (contacts + working hours) on the standalone (polling) bot. */
export function registerClubCommand(bot: Bot<Context>): void {
    bot.command('club', async (ctx) => {
        const apiUrl = process.env['API_URL'];
        if (!apiUrl) {
            await ctx.reply('Сервис временно недоступен. Попробуйте позже.');
            return;
        }
        try {
            const response = await fetch(`${apiUrl}/api/club-info`);
            if (!response.ok) throw new Error(`API responded with ${response.status}`);
            const club = (await response.json()) as IClubInfo;
            await ctx.reply(buildClubMessage(club), { parse_mode: 'HTML' });
        } catch {
            await ctx.reply('Не удалось загрузить информацию о клубе. Попробуйте позже.');
        }
    });
}
