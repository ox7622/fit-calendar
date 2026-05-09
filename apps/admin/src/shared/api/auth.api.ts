import type { AdminProfile } from '@/shared/stores/adminStore';

import { adminApiClient } from './client';

export interface LoginRequest {
    email: string;
    password: string;
}

export interface LoginResponse {
    token: string;
    admin: AdminProfile;
}

export const adminAuthApi = {
    login(payload: LoginRequest): Promise<LoginResponse> {
        // The login endpoint is the only public route — skip the Bearer header so we
        // don't accidentally attach a stale (e.g. logged-out admin's) token.
        return adminApiClient.post<LoginResponse>('/admin/auth/login', payload, { skipAuth: true });
    },

    /**
     * MVP: client-side logout only. The JWT is stateless and expires after 24h —
     * server-side revocation would require a token blacklist (see Story 6.1 Dev Notes
     * "Token revocation — why MVP doesn't need it").
     */
    logout(): void {
        // Intentional no-op at the API level. AdminShell handles the local cleanup.
    },
};
