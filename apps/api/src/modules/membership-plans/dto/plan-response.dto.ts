import type { TDurationUnit } from '@fitcalendar/db';
import { ApiProperty } from '@nestjs/swagger';

export class PlanResponseDto {
    @ApiProperty({ description: 'Plan UUID' })
    id: string;

    @ApiProperty({ example: '12-месячный' })
    name: string;

    @ApiProperty({ example: 12 })
    durationValue: number;

    @ApiProperty({ enum: ['day', 'week', 'month'], example: 'month' })
    durationUnit: TDurationUnit;

    @ApiProperty({ example: 30000, description: 'Price in whole rubles' })
    priceRub: number;

    @ApiProperty({ type: [String], example: ['2 гостевых визита'] })
    features: string[];

    @ApiProperty({ example: 2 })
    guestVisitsAllowed: number;

    @ApiProperty({ example: 30 })
    freezeDaysAllowed: number;
}

export class AdminPlanResponseDto extends PlanResponseDto {
    @ApiProperty({ example: true })
    isActive: boolean;

    @ApiProperty({ type: String, format: 'date-time' })
    createdAt: Date;

    @ApiProperty({ type: String, format: 'date-time' })
    updatedAt: Date;
}

export class PlanOptionDto {
    @ApiProperty({ description: 'Plan UUID' })
    id: string;

    @ApiProperty({ example: '12-месячный' })
    name: string;

    @ApiProperty({ example: '12 месяцев', description: 'Pre-formatted Russian duration label' })
    durationLabel: string;
}
