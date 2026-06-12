import { DifficultyLevel, ImpactType, ScheduleEntry, TrainingType } from '@fitcalendar/db';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AdminAuthModule } from '../auth';

import { AdminTrainingTypesController } from './admin-training-types.controller';
import { AdminTrainingTypesService } from './admin-training-types.service';

@Module({
    imports: [TypeOrmModule.forFeature([TrainingType, ScheduleEntry, DifficultyLevel, ImpactType]), AdminAuthModule],
    controllers: [AdminTrainingTypesController],
    providers: [AdminTrainingTypesService],
    exports: [AdminTrainingTypesService],
})
export class AdminTrainingTypesModule {}
