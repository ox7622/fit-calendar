/**
 * HTTP status codes used by both backend and (potentially) frontend code.
 *
 * These were originally pulled from `@nestjs/common`'s `HttpStatus` enum.
 * That import made `@fitcalendar/shared` unsafe to consume from the browser
 * — Vite couldn't tree-shake the NestJS surface out of the mini-app bundle
 * (~650 KB regression observed during Story 7.1). Numeric literals are
 * defined by HTTP itself, not Nest, so inlining them lets this package
 * stay environment-neutral.
 */
export const STATUS_CODES = {
    // Standard HTTP codes
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,

    // Custom business-logic codes (start at 409)
    UNIQUE_CONSTRAINT_ERROR: 409,
    SESSION_LIMIT_EXCEEDED: 460,
    INVALID_REFRESH_TOKEN: 461,
    SESSION_EXPIRED: 462,
} as const;
