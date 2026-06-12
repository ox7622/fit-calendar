import type { IClassEntry, IWeekDay, ScheduleDataSource } from '@fitcalendar/bot-core';
import { BOT_COMMANDS, registerScheduleCommands as registerShared } from '@fitcalendar/bot-core';
import type { Bot, Context } from 'grammy';

export { BOT_COMMANDS };

async function getJson<T>(url: string): Promise<T> {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`API responded with ${response.status}`);
    return response.json() as Promise<T>;
}

/** HTTP-backed data source: the standalone bot reaches the API over the network. */
function httpDataSource(): ScheduleDataSource {
    const apiUrl = (): string => {
        const url = process.env['API_URL'];
        if (!url) throw new Error('API_URL is not configured');
        return url;
    };
    return {
        getToday: () => getJson<IClassEntry[]>(`${apiUrl()}/api/schedule/today`),
        getByDate: (dateKey) => getJson<IClassEntry[]>(`${apiUrl()}/api/schedule/${dateKey}`),
        getWeek: async (weekOffset) => {
            const { days } = await getJson<{ days: IWeekDay[] }>(
                `${apiUrl()}/api/schedule/week?weekOffset=${weekOffset}`,
            );
            return days;
        },
    };
}

/** Registers /today, /tomorrow, /week and week navigation on the standalone (polling) bot. */
export function registerScheduleCommands(bot: Bot<Context>, miniAppUrl?: string): void {
    registerShared(bot, httpDataSource(), miniAppUrl);
}
