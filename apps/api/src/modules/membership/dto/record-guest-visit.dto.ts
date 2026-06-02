import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class RecordGuestVisitDto {
    @ApiPropertyOptional({ description: 'ISO 8601 datetime; defaults to current time when omitted' })
    @IsOptional()
    @IsDateString()
    visitedAt?: string;

    @ApiPropertyOptional({ maxLength: 500 })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    notes?: string;
}
