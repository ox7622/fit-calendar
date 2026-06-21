import { BotSubscriber } from '@fitcalendar/db';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BotSubscriberService } from './bot-subscriber.service';

@Module({
    imports: [TypeOrmModule.forFeature([BotSubscriber])],
    providers: [BotSubscriberService],
    exports: [BotSubscriberService],
})
export class BotSubscriberModule {}
