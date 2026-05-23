import { adminApiClient, ApiError } from './client';

export type TMembershipStatus = 'active' | 'expired' | 'cancelled';
export type TDurationUnit = 'day' | 'week' | 'month';

export interface IAdminMembershipPlanSnapshot {
    id: string;
    name: string;
    durationValue: number;
    durationUnit: TDurationUnit;
    features: string[];
    guestVisitsAllowed: number;
    freezeDaysAllowed: number;
    priceRub: number;
}

export interface IAdminMembership {
    id: string;
    customerId: string;
    startDate: string;
    endDate: string;
    daysRemaining: number;
    guestVisitsRemaining: number;
    freezeDaysRemaining: number;
    status: TMembershipStatus;
    notes: string | null;
    plan: IAdminMembershipPlanSnapshot;
    createdAt: string;
}

export interface IAssignMembershipPayload {
    planId: string;
    startDate: string; // YYYY-MM-DD
    notes?: string;
}

export interface IUpdateMembershipPayload {
    endDate?: string;
    notes?: string;
}

export interface IActiveExistsError {
    code: 'ACTIVE_MEMBERSHIP_EXISTS';
    message: string;
    existingActive: { id: string; endDate: string };
}

export function isActiveExistsError(data: unknown): data is IActiveExistsError {
    return typeof data === 'object' && data !== null && (data as { code?: string }).code === 'ACTIVE_MEMBERSHIP_EXISTS';
}

export const adminMembershipsApi = {
    listForCustomer: (customerId: string): Promise<IAdminMembership[]> =>
        adminApiClient.get<IAdminMembership[]>(`/admin/customers/${customerId}/memberships`),

    assign: (customerId: string, payload: IAssignMembershipPayload): Promise<IAdminMembership> =>
        adminApiClient.post<IAdminMembership>(`/admin/customers/${customerId}/memberships`, payload),

    update: (id: string, payload: IUpdateMembershipPayload): Promise<IAdminMembership> =>
        adminApiClient.put<IAdminMembership>(`/admin/memberships/${id}`, payload),

    cancel: (id: string): Promise<IAdminMembership> =>
        adminApiClient.post<IAdminMembership>(`/admin/memberships/${id}/cancel`),
};

export { ApiError };
