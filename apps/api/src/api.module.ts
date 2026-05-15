import { baseDbConfig } from '@fitcalendar/nest-shared';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule as NestScheduleModule } from '@nestjs/schedule';
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
import { CustomerModule } from './modules/customer';
import { MembershipPlansModule } from './modules/membership-plans';
import { ReminderModule } from './modules/reminder';
import { ScheduleModule } from './modules/schedule';
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
         * Cron / task scheduler (powers Story 5.3's ReminderDispatcherService).
         * Aliased on import to avoid colliding with the feature ScheduleModule.
         */
        NestScheduleModule.forRoot(),
        /**
         * Bot Module (Telegram webhook handler)
         */
        BotModule,
        /**
         * Customer Module — @Global, exposes CustomerService so
         * TelegramAuthGuard can resolve the linked customer.
         */
        CustomerModule,
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
         * Membership Plans Module
         */
        MembershipPlansModule,
        /**
         * Reminder Module
         */
        ReminderModule,
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
