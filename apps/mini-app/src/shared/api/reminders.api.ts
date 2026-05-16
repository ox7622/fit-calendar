import { apiClient } from './client';

export interface Reminder {
    id: string;
    scheduleEntryId: string;
    notifyAt: string;
    status: 'pending' | 'sent' | 'failed';
}

export interface ReminderListItem {
    id: string;
    scheduleEntryId: string;
    status: 'pending' | 'sent' | 'failed';
    notifyAt: string;
    class: {
        id: string;
        name: string;
        startTime: string;
        durationMinutes: number;
        coachName: string;
        coachPhotoUrl: string | null;
    };
}

export const remindersApi = {
    getList: (): Promise<ReminderListItem[]> => apiClient.get<ReminderListItem[]>('/reminders'),

    subscribe: (scheduleEntryId: string): Promise<Reminder> =>
        apiClient.post<Reminder>('/reminders', { scheduleEntryId }),

    unsubscribe: (reminderId: string): Promise<void> => apiClient.delete<void>(`/reminders/${reminderId}`),
};
