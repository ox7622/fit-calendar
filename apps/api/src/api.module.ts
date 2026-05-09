import { baseDbConfig } from '@fitcalendar/nest-shared';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from 'nestjs-pino';

import { validate } from './config/env.validation';
import { loggerConfig } from './config/logger.config';
import { AppController } from './controllers/app.controller';
import { HealthController } from './controllers/health.controller';
import { BotModule } from './modules/bot';
import { ClubModule } from './modules/club';
import { CoachesModule } from './modules/coaches';
import { ScheduleModule } from './modules/schedule';
import { UserModule } from './modules/user';
import { AppService } from './services/app.service';

@Module({
    imports: [
        /**
         * Config
         */
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: ['.env.local', '.env.dev', '.env'],
            validate,
        }),
        /**
         * TypeOrm
         */
        TypeOrmModule.forRoot({ ...baseDbConfig(), autoLoadEntities: true }),
        /**
         * Logger (Pino)
         */
        LoggerModule.forRoot(loggerConfig),
        /**
         * Bot Module (Telegram webhook handler)
         */
        BotModule,
        /**
         * User Module
         */
        UserModule,
        /**
         * Schedule Module
         */
        ScheduleModule,
        /**
         * Coaches Module
         */
        CoachesModule,
        /**
         * Club Module
         */
        ClubModule,
    ],
    controllers: [AppController, HealthController],
    providers: [AppService],
})
export class ApiModule {}
