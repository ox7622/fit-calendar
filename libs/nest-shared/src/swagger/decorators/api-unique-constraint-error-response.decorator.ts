import { STATUS_CODES } from '@fitcalendar/shared';
import { applyDecorators } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';

import { UniqueConstraintExceptionSchema } from '../schemas/unique-constraint-error.schema';

/**
 * Декоратор для описания ответа Swagger при ошибке нарушения уникальности.
 *
 * @returns Декоратор, применяющий описание ответа.
 */
export function ApiUniqueConstraintErrorResponse() {
    return applyDecorators(
        ApiResponse({
            status: STATUS_CODES.UNIQUE_CONSTRAINT_ERROR,
            description: 'Нарушение уникальности данных.',
            content: {
                'application/json': {
                    schema: UniqueConstraintExceptionSchema(),
                },
            },
        }),
    );
}
