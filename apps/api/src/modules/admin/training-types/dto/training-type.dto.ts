import { TDifficulty, TImpactType, TrainingType } from '@fitcalendar/db';
import { ApiProperty } from '@nestjs/swagger';

import { DIFFICULTY_LEVELS, IMPACT_TYPES } from '../training-types.constants';

export class TrainingTypeDto {
    @ApiProperty() id: string;
    @ApiProperty() name: string;
    @ApiProperty({ nullable: true, type: String }) description: string | null;
    @ApiProperty({ enum: DIFFICULTY_LEVELS }) difficulty: TDifficulty;
    @ApiProperty({ type: [String], enum: IMPACT_TYPES }) impactTypes: TImpactType[];
    @ApiProperty({ type: [String] }) equipment: string[];
    @ApiProperty() isActive: boolean;
    @ApiProperty() createdAt: Date;
    @ApiProperty() updatedAt: Date;
}

export class TrainingTypeOptionDto {
    @ApiProperty() id: string;
    @ApiProperty() name: string;
}

export function toTrainingTypeDto(type: TrainingType): TrainingTypeDto {
    return {
        id: type.id,
        name: type.name,
        description: type.description,
        difficulty: type.difficulty,
        impactTypes: type.impactTypes,
        equipment: type.equipment,
        isActive: type.isActive,
        createdAt: type.createdAt,
        updatedAt: type.updatedAt,
    };
}
