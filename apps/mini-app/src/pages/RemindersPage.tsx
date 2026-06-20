import { format, isSameDay, isTomorrow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { ArrowLeft, Bell, Settings, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { SettingsSheet, showToast } from '@/components';
import { meApi, remindersApi, type ReminderListItem, type TReminderMinutes } from '@/shared/api';
import { useCustomerStore, useRemindersStore } from '@/shared/stores';

interface DayGroup {
    headerLabel: string;
    items: ReminderListItem[];
}

function formatDayHeader(date: Date): string {
    if (isSameDay(date, new Date())) return 'Сегодня';
    if (isTomorrow(date)) return 'Завтра';
    return format(date, 'd MMMM, EEEE', { locale: ru });
}

function groupByDate(items: ReminderListItem[]): DayGroup[] {
    const map = new Map<string, DayGroup>();
    for (const item of items) {
        const startDate = new Date(item.class.startTime);
        const key = format(startDate, 'yyyy-MM-dd');
        const group = map.get(key);
        if (group) {
            group.items.push(item);
        } else {
            map.set(key, { headerLabel: formatDayHeader(startDate), items: [item] });
        }
    }
    return Array.from(map.values());
}

function getInitials(name: string): string {
    return name
        .split(' ')
        .map((part) => part[0] ?? '')
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

function ReminderRowSkeleton(): JSX.Element {
    const shimmer =
        'bg-gradient-to-r from-muted via-muted-foreground/10 to-muted bg-[length:200%_100%] animate-[shimmer_1.5s_infinite_linear] rounded-md';
    return (
        <div className="rounded-2xl border border-border p-3 space-y-2">
            <div className={`h-5 w-2/3 ${shimmer}`} />
            <div className={`h-4 w-1/3 ${shimmer}`} />
            <div className="flex items-center justify-between">
                <div className={`h-4 w-1/2 ${shimmer}`} />
                <div className={`h-7 w-20 rounded-md ${shimmer}`} />
            </div>
        </div>
    );
}

function EmptyState(): JSX.Element {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <Bell size={48} className="text-muted-foreground/50 mb-4" />
            <p className="font-semibold text-foreground mb-1">У вас пока нет напоминаний</p>
            <p className="text-sm text-muted-foreground">Откройте занятие и нажмите «Напомнить»</p>
        </div>
    );
}

export function RemindersPage(): JSX.Element {
    const navigate = useNavigate();
    const reminders = useRemindersStore((s) => s.reminders);
    const isLoading = useRemindersStore((s) => s.isLoading);
    const error = useRemindersStore((s) => s.error);
    const hasLoaded = useRemindersStore((s) => s.hasLoaded);
    const loadReminders = useRemindersStore((s) => s.loadReminders);
    const removeReminder = useRemindersStore((s) => s.removeReminder);
    const restoreReminder = useRemindersStore((s) => s.restoreReminder);
    const customer = useCustomerStore((s) => s.customer);
    const setReminderMinutes = useCustomerStore((s) => s.setReminderMinutes);

    const [settingsOpen, setSettingsOpen] = useState(false);

    useEffect(() => {
        if (!hasLoaded && !isLoading) {
            loadReminders();
        }
    }, [hasLoaded, isLoading, loadReminders]);

    const onCancel = async (item: ReminderListItem, index: number): Promise<void> => {
        removeReminder(item.id);
        try {
            await remindersApi.unsubscribe(item.id);
            showToast('Напоминание отменено');
        } catch {
            // Restore at the original index so the visual order is preserved.
            restoreReminder(item, index);
            showToast('Не удалось отменить напоминание', 'error');
        }
    };

    const onChangeReminderMinutes = async (value: TReminderMinutes): Promise<void> => {
        try {
            const response = await meApi.updateSettings(value);
            setReminderMinutes(response.reminderMinutes);
            showToast('Сохранено');
        } catch {
            showToast('Не удалось сохранить', 'error');
        }
    };

    const groups = groupByDate(reminders);

    return (
        <div className="flex flex-col h-full">
            <div className="px-4 pt-4 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => navigate('/me')}
                        aria-label="Назад в профиль"
                        className="p-1.5 -ml-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="heading-2">Напоминания</h1>
                </div>
                {customer && (
                    <button
                        type="button"
                        onClick={() => setSettingsOpen(true)}
                        aria-label="Настройки"
                        className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                    >
                        <Settings size={20} />
                    </button>
                )}
            </div>

            {settingsOpen && customer && (
                <SettingsSheet
                    currentValue={customer.reminderMinutes}
                    onChange={onChangeReminderMinutes}
                    onClose={() => setSettingsOpen(false)}
                />
            )}

            <div className="flex-1 overflow-y-auto px-4 pb-4">
                {isLoading && !hasLoaded ? (
                    <div className="space-y-3">
                        <ReminderRowSkeleton />
                        <ReminderRowSkeleton />
                        <ReminderRowSkeleton />
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center h-full text-center py-8">
                        <p className="text-error text-sm mb-3">{error}</p>
                        <button type="button" onClick={loadReminders} className="text-sm text-primary underline">
                            Повторить
                        </button>
                    </div>
                ) : reminders.length === 0 ? (
                    <EmptyState />
                ) : (
                    <div className="space-y-5">
                        {groups.map((group, groupIndex) => (
                            <section key={group.headerLabel + groupIndex} className="space-y-2">
                                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                                    {group.headerLabel}
                                </h2>
                                <div className="space-y-2">
                                    {group.items.map((item) => {
                                        const indexInList = reminders.findIndex((r) => r.id === item.id);
                                        return (
                                            <article
                                                key={item.id}
                                                className="rounded-2xl border border-border bg-card p-3 transition-colors active:bg-muted/50"
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() => navigate(`/schedule/${item.scheduleEntryId}`)}
                                                    className="w-full text-left"
                                                >
                                                    <p className="font-semibold text-foreground">{item.class.name}</p>
                                                    <p className="text-sm text-muted-foreground mt-0.5">
                                                        {format(new Date(item.class.startTime), 'HH:mm', {
                                                            locale: ru,
                                                        })}
                                                        {' · '}
                                                        {item.class.durationMinutes} мин
                                                    </p>
                                                </button>

                                                <div className="flex items-center justify-between mt-2.5">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        {item.class.coachPhotoUrl ? (
                                                            <img
                                                                src={item.class.coachPhotoUrl}
                                                                alt={item.class.coachName}
                                                                className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                                                            />
                                                        ) : (
                                                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-semibold flex-shrink-0">
                                                                {getInitials(item.class.coachName)}
                                                            </div>
                                                        )}
                                                        <span className="text-sm text-foreground truncate">
                                                            {item.class.coachName}
                                                        </span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onCancel(item, indexInList);
                                                        }}
                                                        className="inline-flex items-center gap-1 text-sm text-muted-foreground border border-border rounded-md px-2.5 py-1 hover:text-error hover:border-error/30 transition-colors flex-shrink-0"
                                                    >
                                                        <X size={14} />
                                                        Отменить
                                                    </button>
                                                </div>
                                            </article>
                                        );
                                    })}
                                </div>
                            </section>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
