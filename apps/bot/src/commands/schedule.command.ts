import type { Bot, Context } from 'grammy';

interface IClassEntry {
    name: string;
    startTime: string;
    durationMinutes: number;
    status: 'scheduled' | 'cancelled';
    coachName: string;
}

interface IWeekDay {
    date: string;
    classes: IClassEntry[];
}

/** Command list shown in Telegram's "/" menu (set via setMyCommands). */
export const BOT_COMMANDS = [
    { command: 'start', description: 'Запустить бота' },
    { command: 'today', description: 'Расписание на сегодня' },
    { command: 'tomorrow', description: 'Расписание на завтра' },
    { command: 'week', description: 'Расписание на неделю' },
    { command: 'club', description: 'Контакты и часы работы' },
];

function formatDateRu(date: Date): string {
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatDayHeader(isoDate: string): string {
    const label = new Date(`${isoDate}T00:00:00`).toLocaleDateString('ru-RU', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
    });
    return label.charAt(0).toUpperCase() + label.slice(1);
}

function formatTime(isoString: string): string {
    const date = new Date(isoString);
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
}

function classLine(cls: IClassEntry): string {
    const suffix = cls.status === 'cancelled' ? ' ❌ отменено' : '';
    return `⏰ ${formatTime(cls.startTime)} — ${cls.name} (${cls.coachName}, ${cls.durationMinutes}мин)${suffix}`;
}

function miniAppKeyboard(miniAppUrl?: string) {
    return miniAppUrl
        ? { inline_keyboard: [[{ text: '📅 Открыть расписание', web_app: { url: miniAppUrl } }]] }
        : undefined;
}

function tomorrowDateKey(): string {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const pad = (n: number): string => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

async function getJson<T>(url: string): Promise<T> {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`API responded with ${response.status}`);
    return response.json() as Promise<T>;
}

/** Registers /today, /tomorrow and /week on the standalone (polling) bot. */
export function registerScheduleCommands(bot: Bot<Context>, miniAppUrl?: string): void {
    const keyboard = miniAppKeyboard(miniAppUrl);
    const replyOpts = keyboard ? { reply_markup: keyboard } : undefined;

    const replyForDay = async (
        ctx: Context,
        classes: IClassEntry[],
        header: string,
        emptyText: string,
    ): Promise<void> => {
        if (classes.length === 0) {
            await ctx.reply(`${header}\n\n${emptyText}`);
            return;
        }
        await ctx.reply(`${header}\n\n${classes.map(classLine).join('\n')}`, replyOpts);
    };

    bot.command('today', async (ctx) => {
        const apiUrl = process.env['API_URL'];
        if (!apiUrl) {
            await ctx.reply('Сервис временно недоступен. Попробуйте позже.');
            return;
        }
        try {
            const classes = await getJson<IClassEntry[]>(`${apiUrl}/api/schedule/today`);
            await replyForDay(
                ctx,
                classes,
                `📅 Расписание на сегодня, ${formatDateRu(new Date())}`,
                'Сегодня занятий нет 😴',
            );
        } catch {
            await ctx.reply('Не удалось загрузить расписание. Попробуйте позже.');
        }
    });

    bot.command('tomorrow', async (ctx) => {
        const apiUrl = process.env['API_URL'];
        if (!apiUrl) {
            await ctx.reply('Сервис временно недоступен. Попробуйте позже.');
            return;
        }
        try {
            const dateKey = tomorrowDateKey();
            const classes = await getJson<IClassEntry[]>(`${apiUrl}/api/schedule/${dateKey}`);
            await replyForDay(
                ctx,
                classes,
                `📅 Расписание на завтра, ${formatDayHeader(dateKey)}`,
                'Завтра занятий нет 😴',
            );
        } catch {
            await ctx.reply('Не удалось загрузить расписание. Попробуйте позже.');
        }
    });

    bot.command('week', async (ctx) => {
        const apiUrl = process.env['API_URL'];
        if (!apiUrl) {
            await ctx.reply('Сервис временно недоступен. Попробуйте позже.');
            return;
        }
        try {
            const { days } = await getJson<{ days: IWeekDay[] }>(`${apiUrl}/api/schedule/week`);
            const blocks = days
                .filter((day) => day.classes.length > 0)
                .map((day) => `— ${formatDayHeader(day.date)} —\n${day.classes.map(classLine).join('\n')}`);

            if (blocks.length === 0) {
                await ctx.reply('📅 Расписание на неделю\n\nНа этой неделе занятий нет 😴');
                return;
            }
            await ctx.reply(`📅 Расписание на неделю\n\n${blocks.join('\n\n')}`, replyOpts);
        } catch {
            await ctx.reply('Не удалось загрузить расписание. Попробуйте позже.');
        }
    });
}
