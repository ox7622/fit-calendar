// Sentry MUST be initialized before any other imports that you want to instrument.
// We gate on `SENTRY_DSN` so local dev / CI without a DSN doesn't pay the cost.
import './instrument';

import { BadRequestException, Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { Logger as PinoLogger } from 'nestjs-pino';

import { ApiModule } from './api.module';
import { HttpExceptionFilter } from './common/filters';
import { setupSwagger } from './config/swagger';

async function bootstrap() {
    const app = await NestFactory.create(ApiModule, { bufferLogs: true });

    // Use Pino logger
    app.useLogger(app.get(PinoLogger));

    // подключение конфига
    const configService = app.get(ConfigService);

    // Security headers (helmet). Defaults are fine for an API serving JSON +
    // multipart uploads; we relax CSP only because Swagger UI needs inline
    // styles + scripts to render at /api/docs. If you ever serve HTML from
    // this API beyond Swagger, audit the directive carefully.
    app.use(
        helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    scriptSrc: ["'self'", "'unsafe-inline'"],
                    imgSrc: ["'self'", 'data:', 'https:'],
                },
            },
            crossOriginEmbedderPolicy: false,
        }),
    );

    // Global exception filter
    app.useGlobalFilters(new HttpExceptionFilter());

    // CORS configuration
    app.enableCors({
        origin: [
            configService.get<string>('CORS_ORIGIN_MINI_APP'),
            configService.get<string>('CORS_ORIGIN_ADMIN'),
            /localhost:\d+$/,
        ].filter(Boolean) as (string | RegExp)[],
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Telegram-Init-Data'],
    });

    // Настройка глобальных пайпов для валидации и трансформации
    app.useGlobalPipes(
        new ValidationPipe({
            transform: true,
            whitelist: true,
            forbidNonWhitelisted: true,
            exceptionFactory: (errors) => {
                const errorMessages = errors.map((error) => {
                    // Проверяем, существует ли error.constraints
                    if (error.constraints) {
                        return `${error.property} - ${Object.values(error.constraints).join(', ')}`;
                    }
                    // Если constraints нет, возвращаем общее сообщение
                    return `${error.property} имеет некорректное значение`;
                });
                return new BadRequestException(errorMessages);
            },
        }),
    );

    // Настройка Swagger
    setupSwagger(app, configService);

    // Настройка префикса API сервиса
    const apiPrefix = configService.getOrThrow<string>('NX_BE_API_FITCALENDAR_SERVICE_PREFIX');
    app.setGlobalPrefix(apiPrefix);

    const port = configService.getOrThrow<string>('NX_BE_API_FITCALENDAR_SERVICE_PORT');

    await app.listen(port);

    Logger.log(`🌎🚀 API is running on: http://localhost:${port}/${apiPrefix}`);
}

bootstrap();
