import { STATUS_CODES } from '@fitcalendar/shared';
import { applyDecorators } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';

import { PasswordValidationErrorSchema } from '../schemas/password-error.schema';

/**
 * Декоратор для ответа на ошибку валидации пароля
 */
export function ApiPasswordValidationErrorResponse() {
    return applyDecorators(
        ApiResponse({
            status: STATUS_CODES.BAD_REQUEST,
            description: 'Ошибка валидации пароля',
            content: {
                'application/json': {
                    schema: PasswordValidationErrorSchema(),
                },
            },
        }),
    );
}
