import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class RecordFreezeDto {
    @ApiProperty({ description: 'YYYY-MM-DD; future dates allowed for planned freezes' })
    @IsDateString()
    startDate: string;

    @ApiProperty({ minimum: 1, maximum: 365 })
    @IsInt()
    @Min(1)
    @Max(365)
    durationDays: number;

    @ApiPropertyOptional({ maxLength: 500 })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    notes?: string;
}
