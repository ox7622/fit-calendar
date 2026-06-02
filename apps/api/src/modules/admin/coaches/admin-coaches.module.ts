import { Coach, ScheduleEntry } from '@fitcalendar/db';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AdminAuthModule } from '../auth';
import { UploadsModule } from '../uploads';

import { AdminCoachesController } from './admin-coaches.controller';
import { AdminCoachesService } from './admin-coaches.service';

@Module({
    imports: [TypeOrmModule.forFeature([Coach, ScheduleEntry]), AdminAuthModule, UploadsModule],
    controllers: [AdminCoachesController],
    providers: [AdminCoachesService],
    exports: [AdminCoachesService],
})
export class AdminCoachesModule {}
