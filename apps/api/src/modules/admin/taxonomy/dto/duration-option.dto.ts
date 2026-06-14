import { DURATION_OPTION_MAX_MINUTES, DURATION_OPTION_MIN_MINUTES } from '@fitcalendar/shared';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';

export class DurationOptionDto {
    @ApiProperty() id: string;
    @ApiProperty({ example: 60 }) valueMinutes: number;
    @ApiProperty() sortOrder: number;
    @ApiProperty() isActive: boolean;
    @ApiProperty() createdAt: Date;
    @ApiProperty() updatedAt: Date;
}

export class CreateDurationOptionDto {
    @ApiProperty({ minimum: DURATION_OPTION_MIN_MINUTES, maximum: DURATION_OPTION_MAX_MINUTES, example: 60 })
    @IsInt()
    @Min(DURATION_OPTION_MIN_MINUTES)
    @Max(DURATION_OPTION_MAX_MINUTES)
    valueMinutes: number;

    @ApiPropertyOptional({ default: true })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}

export class UpdateDurationOptionDto extends PartialType(CreateDurationOptionDto) {}
