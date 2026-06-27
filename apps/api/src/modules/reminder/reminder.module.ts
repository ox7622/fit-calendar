import { NotificationOutbox, Reminder, ScheduleEntry } from '@fitcalendar/db';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BotSubscriberModule } from '../bot-subscriber/bot-subscriber.module';
import { BotModule } from '../bot/bot.module';
import { ClubModule } from '../club/club.module';

import { ScheduleNotificationListener } from './listeners/schedule-notification.listener';
import { NotificationOutboxDispatcher } from './notification-outbox-dispatcher.service';
import { NotificationOutboxService } from './notification-outbox.service';
import { ReminderDispatcherService } from './reminder-dispatcher.service';
import { ReminderController } from './reminder.controller';
import { ReminderService } from './reminder.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([Reminder, ScheduleEntry, NotificationOutbox]),
        BotModule,
        BotSubscriberModule,
        ClubModule,
    ],
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
