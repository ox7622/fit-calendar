import { DURATION_OPTION_MAX_MINUTES, DURATION_OPTION_MIN_MINUTES } from '@fitcalendar/shared';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsInt, IsUUID, Max, Min } from 'class-validator';

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

    /** Sanity bounds only — the curated list lives in `duration_options` and
     * the admin form drives UX from there. Admins editing via API can
     * register/use any value in this range. */
    @ApiProperty({ minimum: DURATION_OPTION_MIN_MINUTES, maximum: DURATION_OPTION_MAX_MINUTES, example: 60 })
    @IsInt()
    @Min(DURATION_OPTION_MIN_MINUTES)
    @Max(DURATION_OPTION_MAX_MINUTES)
    durationMinutes: number;
}
