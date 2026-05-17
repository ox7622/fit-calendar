import { Reminder, ScheduleEntry } from '@fitcalendar/db';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BotModule } from '../bot/bot.module';

import { ScheduleCancellationListener } from './listeners/schedule-cancellation.listener';
import { ScheduleChangeNotificationListener } from './listeners/schedule-change.listener';
import { ReminderDispatcherService } from './reminder-dispatcher.service';
import { ReminderController } from './reminder.controller';
import { ReminderService } from './reminder.service';

@Module({
    imports: [TypeOrmModule.forFeature([Reminder, ScheduleEntry]), BotModule],
    controllers: [ReminderController],
    providers: [
        ReminderService,
        ReminderDispatcherService,
        ScheduleChangeNotificationListener,
        ScheduleCancellationListener,
    ],
    exports: [ReminderService],
})
export class ReminderModule {}
