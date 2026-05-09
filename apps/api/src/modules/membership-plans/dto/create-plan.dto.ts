import type { TDurationUnit } from '@fitcalendar/db';
import { ApiProperty } from '@nestjs/swagger';
import {
    ArrayMaxSize,
    IsArray,
    IsBoolean,
    IsIn,
    IsInt,
    IsOptional,
    IsString,
    Max,
    MaxLength,
    Min,
    MinLength,
} from 'class-validator';

export class CreatePlanDto {
    @ApiProperty({ example: '12-месячный', description: 'Plan display name' })
    @IsString()
    @MinLength(1)
    @MaxLength(255)
    name: string;

    @ApiProperty({ example: 12, description: 'Number of duration units' })
    @IsInt()
    @Min(1)
    durationValue: number;

    @ApiProperty({ enum: ['day', 'week', 'month'], example: 'month' })
    @IsIn(['day', 'week', 'month'])
    durationUnit: TDurationUnit;

    @ApiProperty({ example: 30000, description: 'Price in whole rubles' })
    @IsInt()
    @Min(0)
    priceRub: number;

    @ApiProperty({
        example: ['2 гостевых визита', '1 месяц заморозки'],
        description: 'Free-form feature labels (max 20, each ≤200 chars)',
        type: [String],
    })
    @IsArray()
    @IsString({ each: true })
    @ArrayMaxSize(20)
    @MaxLength(200, { each: true })
    features: string[];

    @ApiProperty({ example: 2, description: 'Guest visits included with this plan', default: 0 })
    @IsInt()
    @Min(0)
    @Max(365)
    guestVisitsAllowed: number;

    @ApiProperty({ example: 30, description: 'Freeze days included with this plan', default: 0 })
    @IsInt()
    @Min(0)
    @Max(365)
    freezeDaysAllowed: number;

    @ApiProperty({ example: true, default: true, required: false })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}
