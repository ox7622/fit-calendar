import { STATUS_CODES } from '@fitcalendar/shared';
import type { ReferenceObject, SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';

/**
 * Генерирует схему сваггера для ошибки нарушения уникальности.
 *
 * @returns Схема объекта ошибки.
 */
export function UniqueConstraintExceptionSchema(): SchemaObject | ReferenceObject {
    return {
        type: 'object',
        properties: {
            statusCode: {
                type: 'number',
                format: 'int32',
                enum: [STATUS_CODES.UNIQUE_CONSTRAINT_ERROR],
                example: STATUS_CODES.UNIQUE_CONSTRAINT_ERROR,
            },
            message: {
                type: 'string',
                example: 'Значение "existing-slug" для поля "slug" уже существует.',
            },
            field: {
                type: 'string',
                example: 'slug',
            },
        },
        required: ['statusCode', 'message', 'field'],
        additionalProperties: false,
    };
}
