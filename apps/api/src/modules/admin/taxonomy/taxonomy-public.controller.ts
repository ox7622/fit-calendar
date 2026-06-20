import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { DifficultyLevelsService } from './difficulty-levels.service';
import { PublicTaxonomyDto } from './dto/taxonomy-item.dto';
import { ImpactTypesService } from './impact-types.service';

/**
 * Public read of the active taxonomy (no auth) so the mini-app can render
 * difficulty/impact labels + colours from the DB instead of hardcoded maps.
 */
@ApiTags('Taxonomy')
@Controller('taxonomy')
export class TaxonomyPublicController {
    constructor(
        private readonly difficultyLevels: DifficultyLevelsService,
        private readonly impactTypes: ImpactTypesService,
    ) {}

    @Get()
    @ApiOperation({ summary: 'Active difficulty levels + impact types (labels & colours)' })
    @ApiResponse({ status: 200, type: PublicTaxonomyDto })
    async get(): Promise<PublicTaxonomyDto> {
        const [difficultyLevels, impactTypes] = await Promise.all([
            this.difficultyLevels.findActivePublic(),
            this.impactTypes.findActivePublic(),
        ]);
        return { difficultyLevels, impactTypes };
    }
}
