import { adminApiClient } from './client';

export type TDayKey = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface IDayHours {
    open: string;
    close: string;
}

export type TWorkingHours = Partial<Record<TDayKey, IDayHours | null>>;

export interface IAdminClubInfo {
    id: string;
    name: string;
    address: string;
    phone: string | null;
    workingHours: TWorkingHours;
    latitude: number | null;
    longitude: number | null;
    logoUrl: string | null;
    updatedAt: string;
}

export interface IClubInfoUpdatePayload {
    name: string;
    address: string;
    phone?: string;
    workingHours: TWorkingHours;
    latitude?: number;
    longitude?: number;
}

export interface IClubLogoUploadResponse {
    logoUrl: string;
}

export interface IGeocodeResult {
    latitude: number;
    longitude: number;
}

export const adminClubApi = {
    get: (): Promise<IAdminClubInfo> => adminApiClient.get<IAdminClubInfo>('/admin/club-info'),

    update: (payload: IClubInfoUpdatePayload): Promise<IAdminClubInfo> =>
        adminApiClient.put<IAdminClubInfo>('/admin/club-info', payload),

    geocode: (address: string): Promise<IGeocodeResult> =>
        adminApiClient.post<IGeocodeResult>('/admin/club-info/geocode', { address }),

    uploadLogo: (file: File): Promise<IClubLogoUploadResponse> => {
        const form = new FormData();
        form.append('file', file);
        return adminApiClient.upload<IClubLogoUploadResponse>('/admin/club-info/logo', form);
    },
};
