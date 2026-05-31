import type { Bot, Context } from 'grammy';

interface IClassEntry {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
    durationMinutes: number;
    status: 'scheduled' | 'cancelled';
    coachId: string;
    coachName: string;
    coachPhotoUrl: string | null;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    impactTypes: string[];
}

/**
 * Format a date as "22 февраля 2026" in Russian
 */
function formatDateRu(date: Date): string {
    return date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}

/**
 * Format a time from ISO string as "HH:mm"
 */
function formatTime(isoString: string): string {
    const date = new Date(isoString);
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
}

/**
 * Fetch today's schedule from the API
 */
async function fetchTodaySchedule(apiUrl: string): Promise<IClassEntry[]> {
    const url = `${apiUrl}/api/schedule/today`;
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`API responded with ${response.status}`);
    }
    return response.json() as Promise<IClassEntry[]>;
}

/**
 * Register /today command on the standalone bot
 */
export function registerTodayCommand(bot: Bot<Context>, miniAppUrl?: string): void {
    bot.command('today', async (ctx) => {
        const apiUrl = process.env['API_URL'];
        const today = new Date();
        const dateStr = formatDateRu(today);
        const header = `📅 Расписание на сегодня, ${dateStr}\n\n`;

        if (!apiUrl) {
            await ctx.reply('Сервис временно недоступен. Попробуйте позже.');
            return;
        }

        try {
            const classes = await fetchTodaySchedule(apiUrl);

            if (classes.length === 0) {
                await ctx.reply(`${header}Сегодня занятий нет 😴`);
                return;
            }

            const lines = classes
                .map((cls) => {
                    const time = formatTime(cls.startTime);
                    return `⏰ ${time} — ${cls.name} (${cls.coachName}, ${cls.durationMinutes}мин)`;
                })
                .join('\n');

            const messageText = `${header}${lines}`;

            if (miniAppUrl) {
                await ctx.reply(messageText, {
                    reply_markup: {
                        inline_keyboard: [
                            [
                                {
                                    text: '📅 Открыть расписание',
                                    web_app: { url: miniAppUrl },
                                },
                            ],
                        ],
                    },
                });
            } else {
                await ctx.reply(messageText);
            }
        } catch {
            await ctx.reply('Не удалось загрузить расписание. Попробуйте позже.');
        }
    });
}
