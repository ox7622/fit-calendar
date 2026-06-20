import { ApiProperty } from '@nestjs/swagger';

/** Common column shape shared by DifficultyLevel and ImpactType entities. */
export interface ITaxonomyEntity {
    id: string;
    key: string;
    label: string;
    color: string;
    sortOrder: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export class TaxonomyItemDto {
    @ApiProperty() id: string;
    @ApiProperty({ description: 'Stable key referenced by training types' }) key: string;
    @ApiProperty() label: string;
    @ApiProperty({ description: 'Palette colour token' }) color: string;
    @ApiProperty() sortOrder: number;
    @ApiProperty() isActive: boolean;
    @ApiProperty() createdAt: Date;
    @ApiProperty() updatedAt: Date;
}

export function toTaxonomyItemDto(entity: ITaxonomyEntity): TaxonomyItemDto {
    return {
        id: entity.id,
        key: entity.key,
        label: entity.label,
        color: entity.color,
        sortOrder: entity.sortOrder,
        isActive: entity.isActive,
        createdAt: entity.createdAt,
        updatedAt: entity.updatedAt,
    };
}

/** Active-only, lean shape served to the mini-app via the public `/taxonomy`. */
export class PublicTaxonomyItemDto {
    @ApiProperty() key: string;
    @ApiProperty() label: string;
    @ApiProperty() color: string;
    @ApiProperty() sortOrder: number;
}

export class PublicTaxonomyDto {
    @ApiProperty({ type: [PublicTaxonomyItemDto] }) difficultyLevels: PublicTaxonomyItemDto[];
    @ApiProperty({ type: [PublicTaxonomyItemDto] }) impactTypes: PublicTaxonomyItemDto[];
}
