import type { CoachOption } from '../types/filter.types';

import { apiClient } from './client';

export const coachesApi = {
    getList: (): Promise<CoachOption[]> => apiClient.get<CoachOption[]>('/coaches'),
};
