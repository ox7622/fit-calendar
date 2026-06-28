import { Coach, ScheduleEntry, TrainingType } from '@fitcalendar/db';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ClubModule } from '../club/club.module';

import { ScheduleController } from './schedule.controller';
import { ScheduleService } from './schedule.service';

@Module({
    imports: [TypeOrmModule.forFeature([ScheduleEntry, Coach, TrainingType]), ClubModule],
    controllers: [ScheduleController],
    providers: [ScheduleService],
    exports: [ScheduleService],
})
export class ScheduleModule {}
