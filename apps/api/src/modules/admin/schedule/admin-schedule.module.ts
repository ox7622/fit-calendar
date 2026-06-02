import { Coach, ScheduleEntry, TrainingType } from '@fitcalendar/db';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ReminderModule } from '../../reminder';
import { AdminAuthModule } from '../auth';

import { AdminScheduleController } from './admin-schedule.controller';
import { AdminScheduleService } from './admin-schedule.service';

@Module({
    // AdminAuthModule re-exports JwtModule + AdminAuthGuard so the controller
    // can resolve the guard's dependencies. ReminderModule (Story 5.1) provides
    // ReminderService for the post-edit notifyAt recomputation (Story 6.3 AC9).
    imports: [TypeOrmModule.forFeature([ScheduleEntry, Coach, TrainingType]), AdminAuthModule, ReminderModule],
    controllers: [AdminScheduleController],
    providers: [AdminScheduleService],
    exports: [AdminScheduleService],
})
export class AdminScheduleModule {}
