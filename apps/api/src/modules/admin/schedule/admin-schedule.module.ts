import { ScheduleEntry } from '@fitcalendar/db';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AdminAuthModule } from '../auth';

import { AdminScheduleController } from './admin-schedule.controller';
import { AdminScheduleService } from './admin-schedule.service';

@Module({
    // AdminAuthModule re-exports JwtModule + AdminAuthGuard so the controller
    // can resolve the guard's dependencies. Same pattern as MembershipPlansModule.
    imports: [TypeOrmModule.forFeature([ScheduleEntry]), AdminAuthModule],
    controllers: [AdminScheduleController],
    providers: [AdminScheduleService],
    exports: [AdminScheduleService],
})
export class AdminScheduleModule {}
