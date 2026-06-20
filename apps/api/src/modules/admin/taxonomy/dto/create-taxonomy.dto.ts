import { TAXONOMY_COLORS, type TTaxonomyColor } from '@fitcalendar/shared';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateTaxonomyDto {
    @ApiProperty({ minLength: 1, maxLength: 100 })
    @IsString()
    @MinLength(1)
    @MaxLength(100)
    label: string;

    @ApiProperty({ enum: TAXONOMY_COLORS })
    @IsIn(TAXONOMY_COLORS)
    color: TTaxonomyColor;

    @ApiPropertyOptional({ default: true })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}
