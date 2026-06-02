import { adminApiClient } from './client';

export type TDurationUnit = 'day' | 'week' | 'month';

export interface IAdminPlan {
    id: string;
    name: string;
    durationValue: number;
    durationUnit: TDurationUnit;
    priceRub: number;
    features: string[];
    guestVisitsAllowed: number;
    freezeDaysAllowed: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface IPlanFormPayload {
    name: string;
    durationValue: number;
    durationUnit: TDurationUnit;
    priceRub: number;
    features: string[];
    guestVisitsAllowed: number;
    freezeDaysAllowed: number;
    isActive?: boolean;
}

export interface IPlanOption {
    id: string;
    name: string;
    durationLabel: string;
}

export const adminPlansApi = {
    list: (): Promise<IAdminPlan[]> => adminApiClient.get<IAdminPlan[]>('/admin/membership-plans'),
    getById: (id: string): Promise<IAdminPlan> => adminApiClient.get<IAdminPlan>(`/admin/membership-plans/${id}`),
    getOptions: (): Promise<IPlanOption[]> => adminApiClient.get<IPlanOption[]>('/admin/membership-plans/options'),
    create: (payload: IPlanFormPayload): Promise<IAdminPlan> =>
        adminApiClient.post<IAdminPlan>('/admin/membership-plans', payload),
    update: (id: string, payload: Partial<IPlanFormPayload>): Promise<IAdminPlan> =>
        adminApiClient.put<IAdminPlan>(`/admin/membership-plans/${id}`, payload),
    deletePlan: (id: string): Promise<void> => adminApiClient.delete<void>(`/admin/membership-plans/${id}`),
};
