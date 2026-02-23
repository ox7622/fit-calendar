import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { ScheduleModule } from '../schedule/schedule.module';

import { BotController } from './bot.controller';
import { BotService } from './bot.service';

@Module({
    imports: [ConfigModule, ScheduleModule],
    controllers: [BotController],
    providers: [BotService],
    exports: [BotService],
})
export class BotModule {}
