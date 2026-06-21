import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { BotSubscriberModule } from '../bot-subscriber/bot-subscriber.module';
import { ClubModule } from '../club/club.module';
import { ScheduleModule } from '../schedule/schedule.module';

import { BotController } from './bot.controller';
import { BotService } from './bot.service';

@Module({
    imports: [ConfigModule, ScheduleModule, ClubModule, BotSubscriberModule],
    controllers: [BotController],
    providers: [BotService],
    exports: [BotService],
})
export class BotModule {}
