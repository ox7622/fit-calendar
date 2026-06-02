import type { CoachOption } from '../types/filter.types';
import type { ScheduleClass } from '../types/schedule.types';

import { apiClient } from './client';

export interface CoachDetail {
    id: string;
    name: string;
    bio: string | null;
    photoUrl: string | null;
    specializations: string[];
    certifications: string[];
}

export const coachesApi = {
    getList: (): Promise<CoachOption[]> => apiClient.get<CoachOption[]>('/coaches'),

    getById: (id: string): Promise<CoachDetail> => apiClient.get<CoachDetail>(`/coaches/${id}`),

    getSchedule: (id: string): Promise<ScheduleClass[]> => apiClient.get<ScheduleClass[]>(`/coaches/${id}/schedule`),
};
