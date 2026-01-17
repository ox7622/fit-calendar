import { DocumentBuilder } from '@nestjs/swagger';

/**
 * Возвращает общую конфигурацию для Swagger
 */
export function createSwaggerConfig() {
    return new DocumentBuilder()
        .setTitle('FitCalendar API')
        .setDescription('API для работы с данными FitCalendar')
        .setVersion('1.0')
        .addTag('API')
        .build();
}
