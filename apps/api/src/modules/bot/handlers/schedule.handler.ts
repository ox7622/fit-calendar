import type { Bot, Context } from 'grammy';

import type { ClassResponseDto } from '../../schedule/dto/schedule-response.dto';
import type { ScheduleService } from '../../schedule/schedule.service';

/** Command list shown in Telegram's "/" menu (set via setMyCommands). */
export const BOT_COMMANDS = [
    { command: 'today', description: 'Расписание на сегодня' },
    { command: 'tomorrow', description: 'Расписание на завтра' },
    { command: 'week', description: 'Расписание на неделю' },
    { command: 'club', description: 'Контакты и часы работы' },
];

function formatDateRu(date: Date): string {
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** "Понедельник, 2 июня" from a YYYY-MM-DD key. */
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

function classLine(cls: ClassResponseDto): string {
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

/** Registers /today, /tomorrow and /week on the (webhook) bot. */
export function registerScheduleCommands(
    bot: Bot<Context>,
    scheduleService: ScheduleService,
    miniAppUrl?: string,
): void {
    const keyboard = miniAppKeyboard(miniAppUrl);

    const replyForDay = async (
        ctx: Context,
        classes: ClassResponseDto[],
        header: string,
        emptyText: string,
    ): Promise<void> => {
        if (classes.length === 0) {
            await ctx.reply(`${header}\n\n${emptyText}`);
            return;
        }
        const body = classes.map(classLine).join('\n');
        await ctx.reply(`${header}\n\n${body}`, keyboard ? { reply_markup: keyboard } : undefined);
    };

    bot.command('today', async (ctx) => {
        try {
            const classes = await scheduleService.getToday();
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
        try {
            const dateKey = tomorrowDateKey();
            const classes = await scheduleService.getByDate(dateKey);
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
        try {
            const { days } = await scheduleService.getWeek();
            const blocks = days
                .filter((day) => day.classes.length > 0)
                .map((day) => `— ${formatDayHeader(day.date)} —\n${day.classes.map(classLine).join('\n')}`);

            if (blocks.length === 0) {
                await ctx.reply('📅 Расписание на неделю\n\nНа этой неделе занятий нет 😴');
                return;
            }

            await ctx.reply(
                `📅 Расписание на неделю\n\n${blocks.join('\n\n')}`,
                keyboard ? { reply_markup: keyboard } : undefined,
            );
        } catch {
            await ctx.reply('Не удалось загрузить расписание. Попробуйте позже.');
        }
    });
}
