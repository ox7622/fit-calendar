import { Coach, Reminder, ScheduleEntry, TrainingType } from '@fitcalendar/db';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ScheduleController } from './schedule.controller';
import { ScheduleService } from './schedule.service';

@Module({
    // Reminder is registered here so TypeORM can resolve ScheduleEntry's
    // `@OneToMany(() => Reminder)` inverse relation at boot. Story 5.1 will
    // own Reminder via a dedicated ReminderModule; this entry can come out then.
    imports: [TypeOrmModule.forFeature([ScheduleEntry, Coach, TrainingType, Reminder])],
    controllers: [ScheduleController],
    providers: [ScheduleService],
    exports: [ScheduleService],
})
export class ScheduleModule {}
