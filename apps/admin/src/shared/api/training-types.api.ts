import { IMPACT_TYPES as SHARED_IMPACT_TYPES, type TImpactType as TSharedImpactType } from '@fitcalendar/shared';

import { adminApiClient } from './client';

export type TDifficulty = 'beginner' | 'intermediate' | 'advanced';
export type TImpactType = TSharedImpactType;

export const DIFFICULTY_LEVELS: TDifficulty[] = ['beginner', 'intermediate', 'advanced'];
// Re-exported as a mutable array for consumers that expect `TImpactType[]`
// (admin form code does `IMPACT_TYPES.map(...)`). The `as const` tuple from
// `@fitcalendar/shared` is read-only and would force `.map((t) => ...)` to
// widen, so we copy into a plain array here.
export const IMPACT_TYPES: TImpactType[] = [...SHARED_IMPACT_TYPES];

export interface IAdminTrainingType {
    id: string;
    name: string;
    description: string | null;
    difficulty: TDifficulty;
    impactTypes: TImpactType[];
    equipment: string[];
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface ITrainingTypeOption {
    id: string;
    name: string;
}

export interface ITrainingTypeFormPayload {
    name: string;
    description?: string;
    difficulty: TDifficulty;
    impactTypes: TImpactType[];
    equipment: string[];
    isActive?: boolean;
}

export const adminTrainingTypesApi = {
    list: (): Promise<IAdminTrainingType[]> => adminApiClient.get<IAdminTrainingType[]>('/admin/training-types'),

    getOptions: (): Promise<ITrainingTypeOption[]> =>
        adminApiClient.get<ITrainingTypeOption[]>('/admin/training-types/options'),

    getById: (id: string): Promise<IAdminTrainingType> =>
        adminApiClient.get<IAdminTrainingType>(`/admin/training-types/${id}`),

    create: (payload: ITrainingTypeFormPayload): Promise<IAdminTrainingType> =>
        adminApiClient.post<IAdminTrainingType>('/admin/training-types', payload),

    update: (id: string, payload: Partial<ITrainingTypeFormPayload>): Promise<IAdminTrainingType> =>
        adminApiClient.put<IAdminTrainingType>(`/admin/training-types/${id}`, payload),

    deleteType: (id: string): Promise<void> => adminApiClient.delete<void>(`/admin/training-types/${id}`),
};
