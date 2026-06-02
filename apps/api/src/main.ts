// Sentry MUST be initialized before any other imports that you want to instrument.
// We gate on `SENTRY_DSN` so local dev / CI without a DSN doesn't pay the cost.
import './instrument';

import { BadRequestException, Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { Logger as PinoLogger } from 'nestjs-pino';

import { ApiModule } from './api.module';
import { HttpExceptionFilter } from './common/filters';
import { setupSwagger } from './config/swagger';

async function bootstrap() {
    const app = await NestFactory.create<NestExpressApplication>(ApiModule, {
        bufferLogs: true,
        bodyParser: false,
    });

    // Use Pino logger
    app.useLogger(app.get(PinoLogger));

    // Graceful shutdown: triggers onModuleDestroy / onApplicationShutdown hooks
    // on SIGTERM so the reminder dispatcher tick + in-flight DB transactions
    // can finish before the process exits. Without this, a SIGTERM kills the
    // event loop mid-work and leaves transactions to be rolled back by Postgres.
    app.enableShutdownHooks();

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

    // Cap JSON + urlencoded bodies at 1 MB. File uploads (coach photo, club
    // logo, customer CSV) all use `FileInterceptor` with their own per-route
    // `fileSize` limits, so this cap doesn't touch them. The default Express
    // limit is 100 KB which is fine but undocumented; setting it explicitly
    // makes the DoS surface obvious. Nest's own bodyParser is disabled above
    // via `bodyParser: false` so these registrations are authoritative.
    app.useBodyParser('json', { limit: '1mb' });
    app.useBodyParser('urlencoded', { extended: true, limit: '1mb' });

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

    // Swagger is gated by SWAGGER_ENABLED (default "true"). Set "false" in
    // production so the schema + every endpoint shape isn't publicly discoverable.
    if (configService.get<string>('SWAGGER_ENABLED') !== 'false') {
        setupSwagger(app, configService);
    }

    // Настройка префикса API сервиса
    const apiPrefix = configService.getOrThrow<string>('NX_BE_API_FITCALENDAR_SERVICE_PREFIX');
    app.setGlobalPrefix(apiPrefix);

    // Bind to the platform-provided PORT when present (Railway/Render/etc.),
    // falling back to the configured service port for local dev. Always bind
    // 0.0.0.0 so the container is reachable from outside.
    const port = process.env.PORT ?? configService.getOrThrow<string>('NX_BE_API_FITCALENDAR_SERVICE_PORT');

    await app.listen(port, '0.0.0.0');

    Logger.log(`🌎🚀 API is running on port ${port} (prefix /${apiPrefix})`);
}

bootstrap();
