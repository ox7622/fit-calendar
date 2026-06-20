import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

import { REMINDER_MINUTES_OPTIONS } from '../customer.constants';

export class UpdateSettingsDto {
    @ApiProperty({
        enum: REMINDER_MINUTES_OPTIONS,
        example: 30,
        description: 'Minutes before class start to fire the reminder',
    })
    @IsIn(REMINDER_MINUTES_OPTIONS as unknown as number[])
    reminderMinutes: number;
}

export class SettingsResponseDto {
    @ApiProperty({ example: 30 })
    reminderMinutes: number;
}
