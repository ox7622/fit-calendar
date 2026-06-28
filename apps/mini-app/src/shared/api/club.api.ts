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

// Club info is effectively static per session. Memoise the request so the
// timezone provider, ClubPage and PlansPage share one fetch instead of each
// hitting /club-info on mount. Cleared on failure so a retry can re-fetch.
let infoPromise: Promise<ClubInfo> | null = null;

export const clubApi = {
    getInfo: (): Promise<ClubInfo> => {
        infoPromise ??= apiClient.get<ClubInfo>('/club-info').catch((err) => {
            infoPromise = null;
            throw err;
        });
        return infoPromise;
    },
};
