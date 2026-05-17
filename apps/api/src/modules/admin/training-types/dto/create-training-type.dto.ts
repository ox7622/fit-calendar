import type { TDifficulty, TImpactType } from '@fitcalendar/db';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    ArrayMaxSize,
    ArrayMinSize,
    IsArray,
    IsBoolean,
    IsIn,
    IsOptional,
    IsString,
    MaxLength,
    MinLength,
} from 'class-validator';

import { DIFFICULTY_LEVELS, IMPACT_TYPES } from '../training-types.constants';

export class CreateTrainingTypeDto {
    @ApiProperty({ minLength: 2, maxLength: 255 })
    @IsString()
    @MinLength(2)
    @MaxLength(255)
    name: string;

    @ApiPropertyOptional({ maxLength: 2000 })
    @IsOptional()
    @IsString()
    @MaxLength(2000)
    description?: string;

    @ApiProperty({ enum: DIFFICULTY_LEVELS })
    @IsIn(DIFFICULTY_LEVELS)
    difficulty: TDifficulty;

    @ApiProperty({ enum: IMPACT_TYPES, isArray: true, minItems: 1 })
    @IsArray()
    @ArrayMinSize(1)
    @IsIn(IMPACT_TYPES, { each: true })
    impactTypes: TImpactType[];

    @ApiProperty({ type: [String], maxItems: 30 })
    @IsArray()
    @IsString({ each: true })
    @ArrayMaxSize(30)
    @MaxLength(100, { each: true })
    equipment: string[];

    @ApiPropertyOptional({ default: true })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}
