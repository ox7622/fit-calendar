import type { Bot, Context } from 'grammy';

interface IWorkingHoursEntry {
    open: string;
    close: string;
}

interface IClubInfo {
    name: string;
    address: string;
    phone: string | null;
    workingHours: Record<string, IWorkingHoursEntry | null>;
    latitude: number | null;
    longitude: number | null;
}

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

function formatWorkingHours(hours: Record<string, IWorkingHoursEntry | null> | undefined): string {
    return DAY_DEFS.map(({ label, keys }) => {
        const key = keys.find((k) => hours?.[k] !== undefined);
        const entry = key ? hours?.[key] : undefined;
        return `${label}: ${entry ? `${entry.open}–${entry.close}` : 'выходной'}`;
    }).join('\n');
}

/** Map buttons — let the user pick their maps app (links open the native app if installed). */
function mapButtons(club: IClubInfo): Array<Array<{ text: string; url: string }>> {
    const hasCoords = club.latitude !== null && club.longitude !== null;
    const q = encodeURIComponent(club.address);
    const yandex = hasCoords
        ? `https://yandex.ru/maps/?pt=${club.longitude},${club.latitude}&z=17&l=map`
        : `https://yandex.ru/maps/?text=${q}`;
    const google = hasCoords
        ? `https://maps.google.com/?q=${club.latitude},${club.longitude}`
        : `https://maps.google.com/?q=${q}`;
    const dgis = hasCoords ? `https://2gis.ru/geo/${club.longitude},${club.latitude}` : `https://2gis.ru/search/${q}`;
    return [
        [
            { text: '🗺 Яндекс Карты', url: yandex },
            { text: '🗺 Google Maps', url: google },
        ],
        [{ text: '🗺 2ГИС', url: dgis }],
    ];
}

function buildClubMessage(club: IClubInfo): string {
    const lines = [`🏛 ${club.name}`, '', `📍 ${club.address}`];
    if (club.phone) lines.push(`📞 ${club.phone}`);
    lines.push('', '🕐 Часы работы:', formatWorkingHours(club.workingHours));
    return lines.join('\n');
}

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
            await ctx.reply(buildClubMessage(club), {
                reply_markup: { inline_keyboard: mapButtons(club) },
            });

            // A native location pin: tapping it offers "Open in…" with every maps
            // app installed on the device (Organic Maps, Apple Maps, 2ГИС, …) —
            // covering apps that have no coordinate https link for a button.
            if (club.latitude !== null && club.longitude !== null) {
                await ctx.replyWithVenue(club.latitude, club.longitude, club.name, club.address);
            }
        } catch {
            await ctx.reply('Не удалось загрузить информацию о клубе. Попробуйте позже.');
        }
    });
}
