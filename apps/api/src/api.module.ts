import { baseDbConfig } from '@fitcalendar/nest-shared';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from 'nestjs-pino';

import { validate } from './config/env.validation';
import { loggerConfig } from './config/logger.config';
import { AppController } from './controllers/app.controller';
import { HealthController } from './controllers/health.controller';
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
    ],
    controllers: [AppController, HealthController],
    providers: [AppService],
})
export class ApiModule {}
