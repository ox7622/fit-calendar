import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayNotEmpty, IsArray, ValidateNested } from 'class-validator';

import { AdminScheduleItemDto } from './admin-schedule-list.dto';
import { CreateScheduleEntryDto } from './create-schedule-entry.dto';

export const BULK_MAX_ENTRIES = 200;

export class BulkCreateScheduleDto {
    @ApiProperty({ type: [CreateScheduleEntryDto], description: `1..${BULK_MAX_ENTRIES} entries` })
    @IsArray()
    @ArrayNotEmpty()
    @ArrayMaxSize(BULK_MAX_ENTRIES)
    @ValidateNested({ each: true })
    @Type(() => CreateScheduleEntryDto)
    entries: CreateScheduleEntryDto[];
}

export class BulkCreateResponseDto {
    @ApiProperty({ example: 12 }) created: number;
    @ApiProperty({ type: [AdminScheduleItemDto] }) items: AdminScheduleItemDto[];
}
