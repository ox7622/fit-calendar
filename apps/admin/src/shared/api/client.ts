import { useAdminStore } from '@/shared/stores/adminStore';

import { ApiError, NetworkError } from './errors';

const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';

type THttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface IRequestOptions {
    headers?: Record<string, string>;
    params?: Record<string, string | number | boolean | undefined>;
    /** Skip the Authorization header — used by the public login endpoint. */
    skipAuth?: boolean;
}

function buildUrl(path: string, params?: IRequestOptions['params']): string {
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

function readToken(): string | null {
    // Prefer the live store; fall back to localStorage if the store hasn't hydrated yet
    // (e.g. very early app boot before the first render).
    const fromStore = useAdminStore.getState().token;
    if (fromStore) return fromStore;
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem('admin_token');
}

function getDefaultHeaders(skipAuth: boolean): Record<string, string> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    if (!skipAuth) {
        const token = readToken();
        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }
    }
    return headers;
}

function handle401() {
    // Clear in-memory + persisted auth.
    useAdminStore.getState().clearAuth();
    // Force a full reload to escape any partial-render state. BASE_URL is "/" in dev
    // (Vite at port 4010 root) and "/admin/" once the production build sets
    // `base: '/admin/'` — both produce the right absolute path here.
    window.location.href = `${import.meta.env.BASE_URL}login`;
}

async function request<T>(method: THttpMethod, path: string, body?: unknown, options?: IRequestOptions): Promise<T> {
    const url = buildUrl(path, options?.params);

    const headers = {
        ...getDefaultHeaders(options?.skipAuth ?? false),
        ...options?.headers,
    };

    const config: RequestInit = { method, headers };

    if (body !== undefined && method !== 'GET') {
        config.body = JSON.stringify(body);
    }

    let response: Response;
    try {
        response = await fetch(url, config);
    } catch (err) {
        if (err instanceof TypeError && err.message.includes('fetch')) {
            throw new NetworkError();
        }
        throw err;
    }

    if (response.status === 204) {
        return undefined as T;
    }

    const data = await response.json().catch(() => null);

    if (!response.ok) {
        if (response.status === 401 && !options?.skipAuth) {
            // Side-effect first, then throw — callers may want to react to the
            // ApiError in addition to the global redirect.
            handle401();
        }
        throw new ApiError(response, data);
    }

    return data as T;
}

export const adminApiClient = {
    get<T>(path: string, options?: IRequestOptions): Promise<T> {
        return request<T>('GET', path, undefined, options);
    },
    post<T>(path: string, body?: unknown, options?: IRequestOptions): Promise<T> {
        return request<T>('POST', path, body, options);
    },
    put<T>(path: string, body?: unknown, options?: IRequestOptions): Promise<T> {
        return request<T>('PUT', path, body, options);
    },
    patch<T>(path: string, body?: unknown, options?: IRequestOptions): Promise<T> {
        return request<T>('PATCH', path, body, options);
    },
    delete<T>(path: string, options?: IRequestOptions): Promise<T> {
        return request<T>('DELETE', path, undefined, options);
    },
};

export { ApiError, NetworkError } from './errors';
