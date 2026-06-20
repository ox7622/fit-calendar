import { adminApiClient } from './client';

// `difficulty` / `impactTypes` hold taxonomy *keys* (admin-defined, not a fixed
// enum) — see the taxonomy module. Consumers resolve key → label/colour via
// `adminDifficultyLevelsApi` / `adminImpactTypesApi`.

export interface IAdminTrainingType {
    id: string;
    name: string;
    description: string | null;
    difficulty: string;
    impactTypes: string[];
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
    difficulty: string;
    impactTypes: string[];
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
