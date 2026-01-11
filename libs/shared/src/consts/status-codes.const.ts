import { HttpStatus } from '@nestjs/common';

export const STATUS_CODES = {
    // Стандартные HTTP коды
    OK: HttpStatus.OK, // 200
    CREATED: HttpStatus.CREATED, // 201
    BAD_REQUEST: HttpStatus.BAD_REQUEST, // 400
    UNAUTHORIZED: HttpStatus.UNAUTHORIZED, // 401
    FORBIDDEN: HttpStatus.FORBIDDEN, // 403
    NOT_FOUND: HttpStatus.NOT_FOUND, // 404

    // Кастомные коды для бизнес-логики (начиная с 409)
    UNIQUE_CONSTRAINT_ERROR: 409,
    SESSION_LIMIT_EXCEEDED: 460,
    INVALID_REFRESH_TOKEN: 461,
    SESSION_EXPIRED: 462,
    // ... другие кастомные коды
} as const;
