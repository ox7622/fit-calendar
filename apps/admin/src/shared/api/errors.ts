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
