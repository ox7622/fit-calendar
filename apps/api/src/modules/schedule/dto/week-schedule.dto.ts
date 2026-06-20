import { ApiProperty } from '@nestjs/swagger';

import { ClassResponseDto } from './schedule-response.dto';

export class DayScheduleDto {
    @ApiProperty({ description: 'Date in YYYY-MM-DD format' })
    date: string;

    @ApiProperty({ description: 'Classes for this day', type: [ClassResponseDto] })
    classes: ClassResponseDto[];
}

export class WeekScheduleDto {
    @ApiProperty({ description: '7 days of schedule starting from today', type: [DayScheduleDto] })
    days: DayScheduleDto[];
}
