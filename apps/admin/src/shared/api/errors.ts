// Mirrors apps/mini-app/src/shared/api/errors.ts so the typed-error pattern
// is consistent across both frontends.

export class ApiError extends Error {
    public readonly status: number;
    public readonly statusText: string;
    public readonly data: unknown;

    constructor(response: Response, data?: unknown) {
        super(`API Error: ${response.status} ${response.statusText}`);
        this.name = 'ApiError';
        this.status = response.status;
        this.statusText = response.statusText;
        this.data = data;
    }

    isAuthError(): boolean {
        return this.status === 401;
    }
    isForbiddenError(): boolean {
        return this.status === 403;
    }
    isNotFoundError(): boolean {
        return this.status === 404;
    }
    isValidationError(): boolean {
        return this.status === 400 || this.status === 422;
    }
    isServerError(): boolean {
        return this.status >= 500;
    }
    isRateLimited(): boolean {
        return this.status === 429;
    }
}

export class NetworkError extends Error {
    constructor(message = 'Network connection failed') {
        super(message);
        this.name = 'NetworkError';
    }
}

/**
 * Pull a human-readable message out of a thrown API error, falling back to a
 * caller-supplied default. Handles the common `ApiError` shape (`data.message`)
 * so call sites don't each re-implement the `instanceof` + cast dance.
 */
export function extractApiMessage(err: unknown, fallback: string): string {
    if (err instanceof ApiError) {
        const body = err.data as { message?: string } | null;
        return body?.message ?? fallback;
    }
    return fallback;
}
