/** App-wide fallback when a club has no timezone set yet. */
export const DEFAULT_TIME_ZONE = 'Europe/Moscow';

export interface ITimeZoneOption {
    /** IANA timezone id, e.g. "Europe/Moscow". */
    id: string;
    /** Russian label for the admin dropdown. */
    label: string;
}

/** Curated list of Russian timezones (МСК−1 … МСК+9), ordered west to east. */
export const RUSSIA_TIME_ZONES: ITimeZoneOption[] = [
    { id: 'Europe/Kaliningrad', label: 'Калининград (МСК−1, UTC+2)' },
    { id: 'Europe/Moscow', label: 'Москва (МСК, UTC+3)' },
    { id: 'Europe/Samara', label: 'Самара (МСК+1, UTC+4)' },
    { id: 'Asia/Yekaterinburg', label: 'Екатеринбург (МСК+2, UTC+5)' },
    { id: 'Asia/Omsk', label: 'Омск (МСК+3, UTC+6)' },
    { id: 'Asia/Krasnoyarsk', label: 'Красноярск (МСК+4, UTC+7)' },
    { id: 'Asia/Irkutsk', label: 'Иркутск (МСК+5, UTC+8)' },
    { id: 'Asia/Yakutsk', label: 'Якутск (МСК+6, UTC+9)' },
    { id: 'Asia/Vladivostok', label: 'Владивосток (МСК+7, UTC+10)' },
    { id: 'Asia/Magadan', label: 'Магадан (МСК+8, UTC+11)' },
    { id: 'Asia/Kamchatka', label: 'Камчатка (МСК+9, UTC+12)' },
];

/** Just the IANA ids — used for validation and quick membership checks. */
export const RUSSIA_TIME_ZONE_IDS: string[] = RUSSIA_TIME_ZONES.map((z) => z.id);

/** True if `id` is one of the supported Russian zones. */
export function isKnownTimeZone(id: string): boolean {
    return RUSSIA_TIME_ZONE_IDS.includes(id);
}
