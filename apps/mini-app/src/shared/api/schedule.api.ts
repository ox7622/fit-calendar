import type { DaySchedule, ScheduleClass } from '../types/schedule.types';
import type { TrainingTypeOption } from '../types/filter.types';

import { apiClient } from './client';

export interface ScheduleFilterParams {
    difficultyLevel?: string;
    impactType?: string;
    trainingTypeId?: string;
    coachId?: string;
    includeCancelled?: boolean;
}

function buildFilterParams(filter?: ScheduleFilterParams): Record<string, string | boolean | undefined> {
    if (!filter) return {};
    const params: Record<string, string | boolean | undefined> = {};
    if (filter.difficultyLevel) params['difficultyLevel'] = filter.difficultyLevel;
    if (filter.impactType) params['impactType'] = filter.impactType;
    if (filter.trainingTypeId) params['trainingTypeId'] = filter.trainingTypeId;
    if (filter.coachId) params['coachId'] = filter.coachId;
    if (filter.includeCancelled !== undefined) params['includeCancelled'] = filter.includeCancelled;
    return params;
}

export const scheduleApi = {
    getToday: (filter?: ScheduleFilterParams): Promise<ScheduleClass[]> =>
        apiClient.get<ScheduleClass[]>('/schedule/today', { params: buildFilterParams(filter) }),

    getWeek: (filter?: ScheduleFilterParams): Promise<DaySchedule[]> =>
        apiClient
            .get<{ days: DaySchedule[] }>('/schedule/week', { params: buildFilterParams(filter) })
            .then((response) => response.days),

    getByDate: (date: string, filter?: ScheduleFilterParams): Promise<ScheduleClass[]> =>
        apiClient.get<ScheduleClass[]>(`/schedule/${date}`, { params: buildFilterParams(filter) }),

    getById: (id: string): Promise<ScheduleClass> => apiClient.get<ScheduleClass>(`/schedule/${id}`),

    getMetadata: (): Promise<TrainingTypeOption[]> =>
        apiClient
            .get<TrainingTypeOption[]>('/schedule/metadata/training-types')
            .then((types) => types.map((t) => ({ id: t.id, name: t.name }))),
};
