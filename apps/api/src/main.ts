import { BadRequestException, Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import { ApiModule } from './api.module';
import { setupSwagger } from './config/swagger';

async function bootstrap() {
    const app = await NestFactory.create(ApiModule);

    // подключение конфига
    const configService = app.get(ConfigService);

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
    const apiPrefix = configService.getOrThrow<string>('NX_BE_API_CANALIA_SERVICE_PREFIX');
    app.setGlobalPrefix(apiPrefix);

    const port = configService.getOrThrow<string>('NX_BE_API_CANALIA_SERVICE_PORT');

    await app.listen(port);

    Logger.log(`🌎🚀 API is running on: http://localhost:${port}/${apiPrefix}`);
}

bootstrap();
