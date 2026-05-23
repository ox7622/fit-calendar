import { apiClient } from './client';

export type TMembershipStatus = 'active' | 'expired' | 'cancelled';
export type TDurationUnit = 'day' | 'week' | 'month';

export interface IMembershipPlanSnapshot {
    id: string;
    name: string;
    durationValue: number;
    durationUnit: TDurationUnit;
    features: string[];
    guestVisitsAllowed: number;
    freezeDaysAllowed: number;
    priceRub: number;
}

export interface IMembership {
    id: string;
    customerId: string;
    startDate: string;
    endDate: string;
    daysRemaining: number;
    guestVisitsRemaining: number;
    freezeDaysRemaining: number;
    status: TMembershipStatus;
    notes: string | null;
    plan: IMembershipPlanSnapshot;
    createdAt: string;
}

export interface IMeMembershipResponse {
    membership: IMembership | null;
}

export const meMembershipApi = {
    get: (): Promise<IMeMembershipResponse> => apiClient.get<IMeMembershipResponse>('/me/membership'),
};
