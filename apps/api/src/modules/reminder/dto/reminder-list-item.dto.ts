import type { Reminder, TReminderStatus } from '@fitcalendar/db';
import { ApiProperty } from '@nestjs/swagger';

export class ReminderListItemClassDto {
    @ApiProperty({ description: 'Schedule entry UUID' })
    id: string;

    @ApiProperty({ example: 'Йога для начинающих' })
    name: string;

    @ApiProperty({ type: String, format: 'date-time' })
    startTime: Date;

    @ApiProperty({ example: 60 })
    durationMinutes: number;

    @ApiProperty({ example: 'Мария Иванова' })
    coachName: string;

    @ApiProperty({ nullable: true })
    coachPhotoUrl: string | null;
}

export class ReminderListItemDto {
    @ApiProperty({ description: 'Reminder UUID' })
    id: string;

    @ApiProperty({ description: 'Schedule entry UUID' })
    scheduleEntryId: string;

    @ApiProperty({ enum: ['pending', 'sent', 'failed'], example: 'pending' })
    status: TReminderStatus;

    @ApiProperty({ type: String, format: 'date-time' })
    notifyAt: Date;

    @ApiProperty({ type: ReminderListItemClassDto })
    class: ReminderListItemClassDto;
}

/**
 * Mapper used by `ReminderService.findActiveByCustomer` — relies on the
 * caller having eager-loaded `scheduleEntry`, `scheduleEntry.coach`, and
 * `scheduleEntry.trainingType`.
 */
export function toReminderListItem(reminder: Reminder): ReminderListItemDto {
    const entry = reminder.scheduleEntry;
    return {
        id: reminder.id,
        scheduleEntryId: reminder.scheduleEntryId,
        status: reminder.status,
        notifyAt: reminder.notifyAt,
        class: {
            id: entry.id,
            name: entry.trainingType?.name ?? 'Занятие',
            startTime: entry.startTime,
            durationMinutes: entry.durationMinutes,
            coachName: entry.coach?.name ?? '—',
            coachPhotoUrl: entry.coach?.photoUrl ?? null,
        },
    };
}
