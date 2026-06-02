import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsIn, IsInt, IsUUID } from 'class-validator';

export const ALLOWED_DURATIONS = [30, 45, 60, 90] as const;

export class CreateScheduleEntryDto {
    @ApiProperty({ description: 'TrainingType UUID — must be active' })
    @IsUUID()
    trainingTypeId: string;

    @ApiProperty({ description: 'Coach UUID — must be active' })
    @IsUUID()
    coachId: string;

    @ApiProperty({ type: String, format: 'date-time', example: '2026-05-15T10:00:00.000Z' })
    // Transform-then-validate: class-validator's @IsISO8601 keeps the value as
    // a string, so we use @Type(() => Date) + @IsDate to land a real Date on
    // the service.
    @Type(() => Date)
    @IsDate()
    startTime: Date;

    @ApiProperty({ enum: ALLOWED_DURATIONS, example: 60 })
    @IsInt()
    @IsIn(ALLOWED_DURATIONS as unknown as number[])
    durationMinutes: number;
}
