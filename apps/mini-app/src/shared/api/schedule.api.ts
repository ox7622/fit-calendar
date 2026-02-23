import type { DaySchedule, ScheduleClass } from '../types/schedule.types';

import { apiClient } from './client';

export const scheduleApi = {
    getToday: (): Promise<ScheduleClass[]> => apiClient.get<ScheduleClass[]>('/schedule/today'),
    getWeek: (): Promise<DaySchedule[]> =>
        apiClient.get<{ days: DaySchedule[] }>('/schedule/week').then((response) => response.days),
    getByDate: (date: string): Promise<ScheduleClass[]> => apiClient.get<ScheduleClass[]>(`/schedule/${date}`),
};
