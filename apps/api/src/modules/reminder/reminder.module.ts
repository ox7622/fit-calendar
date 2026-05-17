import { Reminder, ScheduleEntry } from '@fitcalendar/db';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BotModule } from '../bot/bot.module';

import { ScheduleChangeNotificationListener } from './listeners/schedule-change.listener';
import { ReminderDispatcherService } from './reminder-dispatcher.service';
import { ReminderController } from './reminder.controller';
import { ReminderService } from './reminder.service';

@Module({
    imports: [TypeOrmModule.forFeature([Reminder, ScheduleEntry]), BotModule],
    controllers: [ReminderController],
    providers: [ReminderService, ReminderDispatcherService, ScheduleChangeNotificationListener],
    exports: [ReminderService],
})
export class ReminderModule {}
