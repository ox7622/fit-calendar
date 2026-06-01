import type { Bot, Context } from 'grammy';

import type { ClubInfoDto, IWorkingHoursEntryDto } from '../../club/dto/club-info.dto';
import type { ClubService } from '../../club/club.service';

// Working-hours keys are stored lowercase (monday…) but the no-record stub uses
// short capitalised forms (Mon…) — accept both per day.
const DAY_DEFS: Array<{ label: string; keys: string[] }> = [
    { label: 'Пн', keys: ['monday', 'Mon'] },
    { label: 'Вт', keys: ['tuesday', 'Tue'] },
    { label: 'Ср', keys: ['wednesday', 'Wed'] },
    { label: 'Чт', keys: ['thursday', 'Thu'] },
    { label: 'Пт', keys: ['friday', 'Fri'] },
    { label: 'Сб', keys: ['saturday', 'Sat'] },
    { label: 'Вс', keys: ['sunday', 'Sun'] },
];

// Condenses the week into ranges of identical days, e.g. "Пн–Пт: 07:00–23:00".
function formatWorkingHours(hours: Record<string, IWorkingHoursEntryDto | null> | undefined): string {
    const perDay = DAY_DEFS.map(({ label, keys }) => {
        const key = keys.find((k) => hours?.[k] !== undefined);
        const entry = key ? hours?.[key] : undefined;
        return { label, value: entry ? `${entry.open}–${entry.close}` : 'выходной' };
    });

    const groups: Array<{ from: string; to: string; value: string }> = [];
    for (const day of perDay) {
        const last = groups[groups.length - 1];
        if (last && last.value === day.value) last.to = day.label;
        else groups.push({ from: day.label, to: day.label, value: day.value });
    }

    return groups.map((g) => `${g.from === g.to ? g.from : `${g.from}–${g.to}`}: ${g.value}`).join('\n');
}

function escapeHtml(value: string): string {
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// HTML — the phone is a tel: link so a tap places a call.
export function buildClubMessage(club: ClubInfoDto): string {
    const lines = [`🏛 <b>${escapeHtml(club.name)}</b>`, '', `📍 ${escapeHtml(club.address)}`];
    if (club.phone) {
        const tel = club.phone.replace(/[^\d+]/g, '');
        lines.push(`📞 <a href="tel:${tel}">${escapeHtml(club.phone)}</a>`);
    }
    lines.push('', '🕐 Часы работы:', formatWorkingHours(club.workingHours));
    return lines.join('\n');
}

/** Registers /club (contacts + working hours) on the (webhook) bot. */
export function registerClubCommand(bot: Bot<Context>, clubService: ClubService): void {
    bot.command('club', async (ctx) => {
        try {
            const club = await clubService.getInfo();
            await ctx.reply(buildClubMessage(club), { parse_mode: 'HTML' });

            // A native location pin: tapping it offers "Open in…" with every maps
            // app installed on the device (Organic Maps, Apple Maps, Яндекс, 2ГИС, …).
            if (club.latitude !== null && club.longitude !== null) {
                await ctx.replyWithVenue(club.latitude, club.longitude, club.name, club.address);
            }
        } catch {
            await ctx.reply('Не удалось загрузить информацию о клубе. Попробуйте позже.');
        }
    });
}
