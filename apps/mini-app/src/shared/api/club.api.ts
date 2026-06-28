import { apiClient } from './client';

export interface WorkingHoursEntry {
    open: string;
    close: string;
}

export interface ClubInfo {
    id: string;
    name: string;
    address: string;
    phone: string | null;
    workingHours: Record<string, WorkingHoursEntry | null>;
    mapUrl: string | null;
    logoUrl: string | null;
    timezone: string;
}

export const clubApi = {
    getInfo: (): Promise<ClubInfo> => apiClient.get<ClubInfo>('/club-info'),
};
