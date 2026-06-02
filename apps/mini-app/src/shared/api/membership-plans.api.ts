import { apiClient } from './client';

export type DurationUnit = 'day' | 'week' | 'month';

export interface PlanCard {
    id: string;
    name: string;
    durationValue: number;
    durationUnit: DurationUnit;
    priceRub: number;
    features: string[];
    guestVisitsAllowed: number;
    freezeDaysAllowed: number;
}

export const membershipPlansApi = {
    getList: (): Promise<PlanCard[]> => apiClient.get<PlanCard[]>('/membership-plans'),
};
