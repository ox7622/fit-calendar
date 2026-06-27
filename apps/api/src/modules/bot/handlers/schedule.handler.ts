import type { IClassEntry, ScheduleDataSource } from '@fitcalendar/bot-core';
import { BOT_COMMANDS, registerScheduleCommands as registerShared } from '@fitcalendar/bot-core';
import type { Bot, Context } from 'grammy';

import type { ClubService } from '../../club/club.service';
import type { ClassResponseDto } from '../../schedule/dto/schedule-response.dto';
import type { ScheduleService } from '../../schedule/schedule.service';

export { BOT_COMMANDS };

function toEntry(cls: ClassResponseDto): IClassEntry {
    return {
        name: cls.name,
        startTime: cls.startTime,
        durationMinutes: cls.durationMinutes,
        status: cls.status,
        coachName: cls.coachName,
    };
}

/** In-process data source: the webhook bot calls ScheduleService directly. */
function serviceDataSource(scheduleService: ScheduleService, clubService: ClubService): ScheduleDataSource {
    return {
        getToday: async () => (await scheduleService.getToday()).map(toEntry),
        getByDate: async (dateKey) => (await scheduleService.getByDate(dateKey)).map(toEntry),
        getWeek: async (weekOffset) => {
            const { days } = await scheduleService.getWeek({}, weekOffset);
            return days.map((day) => ({ date: day.date, classes: day.classes.map(toEntry) }));
        },
        getTimeZone: () => clubService.getTimeZone(),
    };
}

/** Registers /today, /tomorrow, /week and week navigation on the webhook bot. */
export function registerScheduleCommands(
    bot: Bot<Context>,
    scheduleService: ScheduleService,
    clubService: ClubService,
    miniAppUrl?: string,
): void {
    registerShared(bot, serviceDataSource(scheduleService, clubService), miniAppUrl);
}
