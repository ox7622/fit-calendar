import { NotificationOutbox, Reminder, ScheduleEntry } from '@fitcalendar/db';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BotModule } from '../bot/bot.module';

import { ScheduleNotificationListener } from './listeners/schedule-notification.listener';
import { NotificationOutboxDispatcher } from './notification-outbox-dispatcher.service';
import { NotificationOutboxService } from './notification-outbox.service';
import { ReminderDispatcherService } from './reminder-dispatcher.service';
import { ReminderController } from './reminder.controller';
import { ReminderService } from './reminder.service';

@Module({
    imports: [TypeOrmModule.forFeature([Reminder, ScheduleEntry, NotificationOutbox]), BotModule],
    controllers: [ReminderController],
    providers: [
        ReminderService,
        ReminderDispatcherService,
        NotificationOutboxService,
        NotificationOutboxDispatcher,
        ScheduleNotificationListener,
    ],
    exports: [ReminderService],
})
export class ReminderModule {}
