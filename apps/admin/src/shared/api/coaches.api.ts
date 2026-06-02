import { adminApiClient } from './client';

export interface IAdminCoach {
    id: string;
    name: string;
    bio: string | null;
    photoUrl: string | null;
    specializations: string[];
    certifications: string[];
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface ICoachOption {
    id: string;
    name: string;
}

export interface ICoachFormPayload {
    name: string;
    bio?: string;
    specializations: string[];
    certifications: string[];
    isActive?: boolean;
}

export interface IPhotoUploadResponse {
    photoUrl: string;
}

export const adminCoachesApi = {
    list: (): Promise<IAdminCoach[]> => adminApiClient.get<IAdminCoach[]>('/admin/coaches'),

    getOptions: (): Promise<ICoachOption[]> => adminApiClient.get<ICoachOption[]>('/admin/coaches/options'),

    getById: (id: string): Promise<IAdminCoach> => adminApiClient.get<IAdminCoach>(`/admin/coaches/${id}`),

    create: (payload: ICoachFormPayload): Promise<IAdminCoach> =>
        adminApiClient.post<IAdminCoach>('/admin/coaches', payload),

    update: (id: string, payload: Partial<ICoachFormPayload>): Promise<IAdminCoach> =>
        adminApiClient.put<IAdminCoach>(`/admin/coaches/${id}`, payload),

    deleteCoach: (id: string): Promise<void> => adminApiClient.delete<void>(`/admin/coaches/${id}`),

    uploadPhoto: (id: string, file: File): Promise<IPhotoUploadResponse> => {
        const form = new FormData();
        form.append('file', file);
        return adminApiClient.upload<IPhotoUploadResponse>(`/admin/coaches/${id}/photo`, form);
    },
};
