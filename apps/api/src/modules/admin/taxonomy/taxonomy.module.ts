import { DifficultyLevel, DurationOption, ImpactType, TrainingType } from '@fitcalendar/db';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AdminAuthModule } from '../auth';

import { DifficultyLevelsController } from './difficulty-levels.controller';
import { DifficultyLevelsService } from './difficulty-levels.service';
import { DurationOptionsController } from './duration-options.controller';
import { DurationOptionsService } from './duration-options.service';
import { ImpactTypesController } from './impact-types.controller';
import { ImpactTypesService } from './impact-types.service';
import { TaxonomyPublicController } from './taxonomy-public.controller';

@Module({
    imports: [TypeOrmModule.forFeature([DifficultyLevel, ImpactType, DurationOption, TrainingType]), AdminAuthModule],
    controllers: [
        DifficultyLevelsController,
        ImpactTypesController,
        DurationOptionsController,
        TaxonomyPublicController,
    ],
    providers: [DifficultyLevelsService, ImpactTypesService, DurationOptionsService],
    exports: [DifficultyLevelsService, ImpactTypesService, DurationOptionsService],
})
export class TaxonomyModule {}
