import { Reminder, ScheduleEntry } from '@fitcalendar/db';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BotModule } from '../bot/bot.module';

import { ReminderDispatcherService } from './reminder-dispatcher.service';
import { ReminderController } from './reminder.controller';
import { ReminderService } from './reminder.service';

@Module({
    imports: [TypeOrmModule.forFeature([Reminder, ScheduleEntry]), BotModule],
    controllers: [ReminderController],
    providers: [ReminderService, ReminderDispatcherService],
    exports: [ReminderService],
})
export class ReminderModule {}
