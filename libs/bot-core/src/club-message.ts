import { escapeHtml } from './format';

/** One day's open/close window. */
export interface IClubWorkingHoursEntry {
    open: string;
    close: string;
}

/**
 * Club contact info as the bot renders it — provider-neutral (no API DTO
 * coupling). The in-API bot passes its ClubInfoDto (a structural superset);
 * the standalone bot decodes the same shape from /api/club-info.
 */
export interface IClubInfo {
    name: string;
    address: string;
    phone: string | null;
    workingHours: Record<string, IClubWorkingHoursEntry | null>;
    mapUrl: string | null;
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

// Condenses the week into ranges of identical days, e.g. "Пн–Пт: 07:00–23:00".
function formatWorkingHours(hours: Record<string, IClubWorkingHoursEntry | null> | undefined): string {
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

/**
 * The /club message (contacts + working hours), as Telegram HTML. The phone is a
 * tel: link so a tap places a call; the map URL opens the configured maps link.
 */
export function buildClubMessage(club: IClubInfo): string {
    const lines = [`🏛 <b>${escapeHtml(club.name)}</b>`, '', `📍 ${escapeHtml(club.address)}`];
    if (club.phone) {
        const tel = club.phone.replace(/[^\d+]/g, '');
        lines.push(`📞 <a href="tel:${tel}">${escapeHtml(club.phone)}</a>`);
    }
    if (club.mapUrl) {
        lines.push(`🗺 <a href="${escapeHtml(club.mapUrl)}">Открыть на карте</a>`);
    }
    lines.push('', '🕐 Часы работы:', formatWorkingHours(club.workingHours));
    return lines.join('\n');
}
