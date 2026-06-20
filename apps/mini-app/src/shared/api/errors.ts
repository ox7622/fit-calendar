/**
 * API Error class for handling HTTP errors
 */
export class ApiError extends Error {
    public readonly status: number;
    public readonly statusText: string;
    public readonly data: unknown;

    constructor(response: Response, data?: unknown) {
        const message = `API Error: ${response.status} ${response.statusText}`;
        super(message);
        this.name = 'ApiError';
        this.status = response.status;
        this.statusText = response.statusText;
        this.data = data;
    }

    /**
     * Check if error is an authentication error
     */
    isAuthError(): boolean {
        return this.status === 401;
    }

    /**
     * Check if error is a forbidden error
     */
    isForbiddenError(): boolean {
        return this.status === 403;
    }

    /**
     * Check if error is a not found error
     */
    isNotFoundError(): boolean {
        return this.status === 404;
    }

    /**
     * Check if error is a validation error
     */
    isValidationError(): boolean {
        return this.status === 400 || this.status === 422;
    }

    /**
     * Check if error is a server error
     */
    isServerError(): boolean {
        return this.status >= 500;
    }
}

/**
 * Network error for connection failures
 */
export class NetworkError extends Error {
    constructor(message = 'Network connection failed') {
        super(message);
        this.name = 'NetworkError';
    }
}
