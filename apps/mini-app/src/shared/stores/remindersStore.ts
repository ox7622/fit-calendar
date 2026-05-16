import { create } from 'zustand';

import { remindersApi, type ReminderListItem } from '@/shared/api';

interface RemindersState {
    reminders: ReminderListItem[];
    isLoading: boolean;
    error: string | null;
    /**
     * Tracks whether the initial load has been attempted (success or failure).
     * AuthProvider uses this to call loadReminders() exactly once after a
     * customer links — re-renders or pages mounting don't trigger duplicate
     * network calls.
     */
    hasLoaded: boolean;
    loadReminders: () => Promise<void>;
    addReminder: (item: ReminderListItem) => void;
    removeReminder: (id: string) => void;
    /**
     * Restore a reminder at its original index (used by optimistic-delete
     * rollback in RemindersPage so the row pops back where it was, not at
     * the end of the list).
     */
    restoreReminder: (item: ReminderListItem, index: number) => void;
    findByScheduleEntry: (scheduleEntryId: string) => ReminderListItem | undefined;
    reset: () => void;
}

const initialState = {
    reminders: [],
    isLoading: false,
    error: null,
    hasLoaded: false,
} satisfies Pick<RemindersState, 'reminders' | 'isLoading' | 'error' | 'hasLoaded'>;

export const useRemindersStore = create<RemindersState>((set, get) => ({
    ...initialState,

    loadReminders: async () => {
        set({ isLoading: true, error: null });
        try {
            const reminders = await remindersApi.getList();
            set({ reminders, isLoading: false, error: null, hasLoaded: true });
        } catch {
            set({ isLoading: false, error: 'Не удалось загрузить напоминания', hasLoaded: true });
        }
    },

    addReminder: (item) => {
        const existing = get().reminders.find((r) => r.id === item.id);
        if (existing) return;
        // Keep the list sorted by class.startTime ASC (matches the server's order).
        const next = [...get().reminders, item].sort(
            (a, b) => new Date(a.class.startTime).getTime() - new Date(b.class.startTime).getTime(),
        );
        set({ reminders: next });
    },

    removeReminder: (id) => {
        set({ reminders: get().reminders.filter((r) => r.id !== id) });
    },

    restoreReminder: (item, index) => {
        const next = [...get().reminders];
        next.splice(Math.min(index, next.length), 0, item);
        set({ reminders: next });
    },

    findByScheduleEntry: (scheduleEntryId) => get().reminders.find((r) => r.scheduleEntryId === scheduleEntryId),

    reset: () => set(initialState),
}));
