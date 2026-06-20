import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class CreateReminderDto {
    @ApiProperty({
        description: 'UUID of the schedule entry to subscribe to',
        example: '123e4567-e89b-12d3-a456-426614174000',
    })
    @IsUUID()
    scheduleEntryId: string;
}
