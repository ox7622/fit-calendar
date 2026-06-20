/**
 * User-facing validation messages shared between backend (NestJS exceptions)
 * and frontend (form errors). Keep keys stable — admin/mini-app may
 * reverse-lookup by message text.
 */
export const VALIDATION_MESSAGES = {
    INVALID_PHONE_FORMAT: 'Неверный формат номера. Пример: +7 999 555 12 34.',
} as const;
