import { DifficultyLevel, ImpactType, TrainingType } from '@fitcalendar/db';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AdminAuthModule } from '../auth';

import { DifficultyLevelsController } from './difficulty-levels.controller';
import { DifficultyLevelsService } from './difficulty-levels.service';
import { ImpactTypesController } from './impact-types.controller';
import { ImpactTypesService } from './impact-types.service';
import { TaxonomyPublicController } from './taxonomy-public.controller';

@Module({
    imports: [TypeOrmModule.forFeature([DifficultyLevel, ImpactType, TrainingType]), AdminAuthModule],
    controllers: [DifficultyLevelsController, ImpactTypesController, TaxonomyPublicController],
    providers: [DifficultyLevelsService, ImpactTypesService],
    exports: [DifficultyLevelsService, ImpactTypesService],
})
export class TaxonomyModule {}
