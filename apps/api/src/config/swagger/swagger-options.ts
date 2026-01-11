import { DocumentBuilder } from '@nestjs/swagger';

/**
 * Возвращает общую конфигурацию для Swagger
 */
export function createSwaggerConfig() {
    return new DocumentBuilder()
        .setTitle('Canalia API')
        .setDescription('API для работы с данными Canalia')
        .setVersion('1.0')
        .addTag('API')
        .build();
}
