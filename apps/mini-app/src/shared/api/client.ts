import { getInitData } from '../telegram';
import { ApiError, NetworkError } from './errors';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestOptions {
    headers?: Record<string, string>;
    params?: Record<string, string | number | boolean | undefined>;
}

/**
 * Build URL with query parameters
 */
function buildUrl(path: string, params?: RequestOptions['params']): string {
    const url = new URL(`${API_BASE}${path}`, window.location.origin);

    if (params) {
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined) {
                url.searchParams.append(key, String(value));
            }
        });
    }

    return url.toString();
}

/**
 * Get default headers including Telegram auth
 */
function getDefaultHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };

    const initData = getInitData();
    if (initData) {
        headers['X-Telegram-Init-Data'] = initData;
    }

    return headers;
}

/**
 * Make an HTTP request
 */
async function request<T>(method: HttpMethod, path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    const url = buildUrl(path, options?.params);

    const headers = {
        ...getDefaultHeaders(),
        ...options?.headers,
    };

    const config: RequestInit = {
        method,
        headers,
    };

    if (body && method !== 'GET') {
        config.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(url, config);

        // Handle no-content responses
        if (response.status === 204) {
            return undefined as T;
        }

        const data = await response.json().catch(() => null);

        if (!response.ok) {
            throw new ApiError(response, data);
        }

        return data as T;
    } catch (error) {
        if (error instanceof ApiError) {
            throw error;
        }

        if (error instanceof TypeError && error.message.includes('fetch')) {
            throw new NetworkError();
        }

        throw error;
    }
}

/**
 * API client with methods for each HTTP verb
 */
export const apiClient = {
    /**
     * GET request
     */
    get<T>(path: string, options?: RequestOptions): Promise<T> {
        return request<T>('GET', path, undefined, options);
    },

    /**
     * POST request
     */
    post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
        return request<T>('POST', path, body, options);
    },

    /**
     * PUT request
     */
    put<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
        return request<T>('PUT', path, body, options);
    },

    /**
     * PATCH request
     */
    patch<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
        return request<T>('PATCH', path, body, options);
    },

    /**
     * DELETE request
     */
    delete<T>(path: string, options?: RequestOptions): Promise<T> {
        return request<T>('DELETE', path, undefined, options);
    },
};

export { ApiError, NetworkError } from './errors';
