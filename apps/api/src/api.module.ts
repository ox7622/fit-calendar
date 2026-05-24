import { baseDbConfig } from '@fitcalendar/nest-shared';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule as NestScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SentryModule } from '@sentry/nestjs/setup';
import { LoggerModule } from 'nestjs-pino';

import { validate } from './config/env.validation';
import { loggerConfig } from './config/logger.config';
import { AppController } from './controllers/app.controller';
import { HealthController } from './controllers/health.controller';
import { AdminAuthModule } from './modules/admin/auth';
import { AdminClubModule } from './modules/admin/club';
import { AdminCoachesModule } from './modules/admin/coaches';
import { AdminScheduleModule } from './modules/admin/schedule';
import { AdminTrainingTypesModule } from './modules/admin/training-types';
import { BotModule } from './modules/bot';
import { ClubModule } from './modules/club';
import { CoachesModule } from './modules/coaches';
import { CustomerModule } from './modules/customer';
import { MembershipModule } from './modules/membership';
import { MembershipPlansModule } from './modules/membership-plans';
import { ReminderModule } from './modules/reminder';
import { ScheduleModule } from './modules/schedule';
import { AppService } from './services/app.service';

@Module({
    imports: [
        /**
         * Sentry — installs the global exception filter that auto-reports
         * uncaught exceptions. The actual `Sentry.init` runs in
         * `instrument.ts` (imported at the very top of main.ts so it
         * loads before NestJS). No-op when SENTRY_DSN is unset.
         */
        SentryModule.forRoot(),
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
         * Event emitter — decouples admin schedule mutations (Stories 6.3/6.4)
         * from reminder notification listeners (Stories 5.4/5.5). See
         * `apps/api/src/modules/admin/schedule/schedule.events.ts` for the
         * event constants + payload types that form the contract.
         */
        EventEmitterModule.forRoot(),
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
        /**
         * Admin Schedule Module
         */
        AdminScheduleModule,
        /**
         * Admin Coaches Module (Story 6.5)
         */
        AdminCoachesModule,
        /**
         * Admin Training Types Module (Story 6.6)
         */
        AdminTrainingTypesModule,
        /**
         * Admin Club Module (Story 6.7)
         */
        AdminClubModule,
        /**
         * Membership Module (Story 7.4) — customer↔plan assignment,
         * /me/membership, daily expiration cron.
         */
        MembershipModule,
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
