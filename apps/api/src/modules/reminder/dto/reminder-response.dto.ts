import type { Reminder, TReminderStatus } from '@fitcalendar/db';
import { ApiProperty } from '@nestjs/swagger';

export class ReminderResponseDto {
    @ApiProperty({ description: 'Reminder UUID' })
    id: string;

    @ApiProperty({ description: 'Schedule entry this reminder is for' })
    scheduleEntryId: string;

    @ApiProperty({ type: String, format: 'date-time', description: 'When the bot will deliver the reminder' })
    notifyAt: Date;

    @ApiProperty({ enum: ['pending', 'sent', 'failed'], example: 'pending' })
    status: TReminderStatus;
}

export function toReminderResponse(reminder: Reminder): ReminderResponseDto {
    return {
        id: reminder.id,
        scheduleEntryId: reminder.scheduleEntryId,
        notifyAt: reminder.notifyAt,
        status: reminder.status,
    };
}
