import { Coach, ScheduleEntry, TrainingType } from '@fitcalendar/db';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CoachesController } from './coaches.controller';
import { CoachesService } from './coaches.service';

@Module({
    imports: [TypeOrmModule.forFeature([Coach, ScheduleEntry, TrainingType])],
    controllers: [CoachesController],
    providers: [CoachesService],
    exports: [CoachesService],
})
export class CoachesModule {}
