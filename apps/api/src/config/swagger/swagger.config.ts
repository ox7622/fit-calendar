import type { INestApplication } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { SwaggerModule } from '@nestjs/swagger';

import { createSwaggerConfig } from './swagger-options';

/**
 * Настраивает Swagger UI и экспортирует документацию в JSON формате.
 * @param app - Инстанс приложения Nest
 * @param configService - Сервис конфигурации для получения переменных окружения
 */
export function setupSwagger(app: INestApplication, configService: ConfigService): void {
    const swaggerPath = configService.getOrThrow<string>('NX_SWAGGER_PATH');
    const swaggerExportPath = configService.getOrThrow<string>('NX_SWAGGER_EXPORT_PATH');

    // Получение общей конфигурации для Swagger
    const config = createSwaggerConfig();
    const document = SwaggerModule.createDocument(app, config);

    // Настройка Swagger UI
    SwaggerModule.setup(swaggerPath, app, document);

    // Экспорт JSON документации по пути NX_SWAGGER_EXPORT_PATH
    app.getHttpAdapter().get(swaggerExportPath, (req, res) => {
        res.header('Content-Type', 'application/json');
        res.send(document);
    });
}
