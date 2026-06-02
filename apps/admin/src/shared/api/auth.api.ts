import type { IAdminProfile } from '@/shared/stores/adminStore';

import { adminApiClient } from './client';

export interface ILoginRequest {
    email: string;
    password: string;
}

export interface ILoginResponse {
    token: string;
    admin: IAdminProfile;
}

export const adminAuthApi = {
    login(payload: ILoginRequest): Promise<ILoginResponse> {
        // The login endpoint is the only public route — skip the Bearer header so we
        // don't accidentally attach a stale (e.g. logged-out admin's) token.
        return adminApiClient.post<ILoginResponse>('/admin/auth/login', payload, { skipAuth: true });
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
