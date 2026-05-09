import { baseDbConfig } from '@fitcalendar/nest-shared';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from 'nestjs-pino';

import { validate } from './config/env.validation';
import { loggerConfig } from './config/logger.config';
import { AppController } from './controllers/app.controller';
import { HealthController } from './controllers/health.controller';
import { AdminAuthModule } from './modules/admin/auth';
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
         * Throttler (global default — 100 req/min per IP, per arch §15.1)
         * Per-route @Throttle() decorators override this default.
         */
        ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
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
        /**
         * Admin Auth Module
         */
        AdminAuthModule,
    ],
    controllers: [AppController, HealthController],
    providers: [
        AppService,
        {
            provide: APP_GUARD,
            useClass: ThrottlerGuard,
        },
    ],
})
export class ApiModule {}
