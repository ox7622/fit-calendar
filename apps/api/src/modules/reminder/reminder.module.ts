import { NotificationOutbox, Reminder, ScheduleEntry } from '@fitcalendar/db';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BotModule } from '../bot/bot.module';

import { ScheduleCancellationListener } from './listeners/schedule-cancellation.listener';
import { ScheduleChangeNotificationListener } from './listeners/schedule-change.listener';
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
        ScheduleChangeNotificationListener,
        ScheduleCancellationListener,
    ],
    exports: [ReminderService],
})
export class ReminderModule {}
