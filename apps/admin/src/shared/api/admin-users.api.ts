import { adminApiClient } from './client';

export interface IAdminUserListItem {
    id: string;
    login: string;
    name: string;
    isActive: boolean;
    lastLoginAt: string | null;
    createdAt: string;
}

export interface IInviteAdminPayload {
    login: string;
    name: string;
}

export interface IIssuedTokenResponse {
    token: string;
    adminUserId: string;
    expiresAt: string;
    action: 'created' | 'reactivated' | 'reset';
}

export const adminUsersApi = {
    list: (): Promise<IAdminUserListItem[]> => adminApiClient.get<IAdminUserListItem[]>('/admin/users'),

    invite: (payload: IInviteAdminPayload): Promise<IIssuedTokenResponse> =>
        adminApiClient.post<IIssuedTokenResponse>('/admin/users/invite', payload),

    resetPassword: (adminUserId: string): Promise<IIssuedTokenResponse> =>
        adminApiClient.post<IIssuedTokenResponse>(`/admin/users/${adminUserId}/reset-password`),
};

export interface IInviteTokenInfo {
    login: string;
    name: string;
    purpose: 'invite' | 'reset';
}

export const adminPasswordSetupApi = {
    getTokenInfo: (token: string): Promise<IInviteTokenInfo> =>
        adminApiClient.get<IInviteTokenInfo>(`/admin/auth/invite-token/${encodeURIComponent(token)}`, {
            skipAuth: true,
        }),

    setPassword: (token: string, password: string): Promise<void> =>
        adminApiClient.post<void>('/admin/auth/set-password', { token, password }, { skipAuth: true }),
};
