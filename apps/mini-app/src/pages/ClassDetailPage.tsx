import { DIFFICULTY_LEVEL_LABELS, IMPACT_TYPES, type TDifficultyLevel, type TImpactType } from '@fitcalendar/shared';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { ArrowLeft, Bell, BellOff, Clock, Dumbbell as DumbbellIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { ImpactTypeBadge, showToast } from '@/components';
import { ApiError, remindersApi, scheduleApi, type ReminderListItem } from '@/shared/api';
import { useCustomerStore, useRemindersStore } from '@/shared/stores';
import type { ScheduleClass } from '@/shared/types/schedule.types';

const difficultyBadgeClass: Record<TDifficultyLevel, string> = {
    beginner: 'bg-success/20 text-success',
    intermediate: 'bg-warning/20 text-warning',
    advanced: 'bg-error/20 text-error',
};

const difficultyLabel = DIFFICULTY_LEVEL_LABELS;

function isKnownImpactType(value: string): value is TImpactType {
    return (IMPACT_TYPES as readonly string[]).includes(value);
}

function extractErrorMessage(body: unknown): string | null {
    if (body && typeof body === 'object' && 'message' in body) {
        const message = (body as { message: unknown }).message;
        if (typeof message === 'string') return message;
    }
    return null;
}

function getInitials(name: string): string {
    return name
        .split(' ')
        .map((part) => part[0] ?? '')
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

function DetailSkeleton(): JSX.Element {
    const shimmer =
        'bg-gradient-to-r from-muted via-muted-foreground/10 to-muted bg-[length:200%_100%] animate-[shimmer_1.5s_infinite_linear] rounded-md';
    return (
        <div className="flex flex-col h-full">
            <div className="px-4 pt-4 pb-3 flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg ${shimmer}`} />
                <div className={`h-6 w-40 ${shimmer}`} />
            </div>
            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
                <div className={`h-8 w-3/4 ${shimmer}`} />
                <div className="flex items-center gap-3">
                    <div className={`w-14 h-14 rounded-full ${shimmer}`} />
                    <div className="space-y-2">
                        <div className={`h-4 w-28 ${shimmer}`} />
                        <div className={`h-3 w-20 ${shimmer}`} />
                    </div>
                </div>
                <div className={`h-4 w-48 ${shimmer}`} />
                <div className="flex gap-2">
                    <div className={`h-6 w-16 ${shimmer}`} />
                    <div className={`h-6 w-16 ${shimmer}`} />
                </div>
            </div>
        </div>
    );
}

export function ClassDetailPage(): JSX.Element {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const customer = useCustomerStore((s) => s.customer);

    const [cls, setCls] = useState<ScheduleClass | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Source of truth for whether *this* class has an active reminder is the
    // shared store (loaded once on auth — see AuthProvider). Story 5.1 used to
    // keep a local Reminder|null here; 5.6 lifted it so RemindersPage and this
    // page stay in sync after subscribe/unsubscribe.
    const reminder = useRemindersStore((s) => (cls ? s.findByScheduleEntry(cls.id) : undefined));
    const addReminder = useRemindersStore((s) => s.addReminder);
    const removeReminder = useRemindersStore((s) => s.removeReminder);
    const [reminderPending, setReminderPending] = useState(false);

    const isPastOrCancelled =
        cls !== null && (cls.status === 'cancelled' || new Date(cls.startTime).getTime() <= Date.now());

    const onSubscribe = async (): Promise<void> => {
        if (!cls || reminderPending) return;
        setReminderPending(true);
        try {
            const created = await remindersApi.subscribe(cls.id);
            // The POST returns the bare Reminder; the store stores ReminderListItem
            // with nested class info. Hydrate from `cls` (already in scope) so we
            // don't burn a second GET /reminders just to enrich one row.
            const listItem: ReminderListItem = {
                id: created.id,
                scheduleEntryId: created.scheduleEntryId,
                status: created.status,
                notifyAt: created.notifyAt,
                class: {
                    id: cls.id,
                    name: cls.name,
                    startTime: cls.startTime,
                    durationMinutes: cls.durationMinutes,
                    coachName: cls.coachName,
                    coachPhotoUrl: cls.coachPhotoUrl,
                },
            };
            addReminder(listItem);
            const minutes = customer?.reminderMinutes ?? 30;
            showToast(`Напомним за ${minutes} минут`);
        } catch (err) {
            const message =
                err instanceof ApiError && err.status === 400
                    ? extractErrorMessage(err.data) ?? 'Не удалось включить напоминание'
                    : 'Не удалось включить напоминание';
            showToast(message, 'error');
        } finally {
            setReminderPending(false);
        }
    };

    const onUnsubscribe = async (): Promise<void> => {
        if (!reminder || reminderPending) return;
        setReminderPending(true);
        try {
            await remindersApi.unsubscribe(reminder.id);
            removeReminder(reminder.id);
            showToast('Напоминание отменено');
        } catch {
            showToast('Не удалось отменить напоминание', 'error');
        } finally {
            setReminderPending(false);
        }
    };

    useEffect(() => {
        if (!id) {
            setError('Некорректный идентификатор занятия');
            setIsLoading(false);
            return;
        }

        let cancelled = false;
        setIsLoading(true);
        setError(null);

        scheduleApi
            .getById(id)
            .then((data) => {
                if (!cancelled) {
                    setCls(data);
                    setIsLoading(false);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setError('Не удалось загрузить информацию о занятии');
                    setIsLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [id]);

    if (isLoading) {
        return <DetailSkeleton />;
    }

    return (
        <div className="flex flex-col h-full">
            {/* Header with back button */}
            <div className="px-4 pt-4 pb-3 flex items-center gap-3">
                <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                    aria-label="Назад"
                >
                    <ArrowLeft size={20} />
                </button>
                <h1 className="heading-2 truncate">{cls ? cls.name : 'Детали занятия'}</h1>
            </div>

            {error || !cls ? (
                <div className="flex-1 flex flex-col items-center justify-center px-4 pb-4 text-center">
                    <p className="text-error text-sm mb-3">{error ?? 'Занятие не найдено'}</p>
                    <button type="button" onClick={() => navigate(-1)} className="text-sm text-primary underline">
                        Вернуться назад
                    </button>
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-5 animate-[fade-in_0.15s_ease-out]">
                    {/* Class name */}
                    <h2 className="heading-1">{cls.name}</h2>

                    {/* Coach info */}
                    <div className="flex items-center gap-3">
                        {cls.coachPhotoUrl ? (
                            <img
                                src={cls.coachPhotoUrl}
                                alt={cls.coachName}
                                className="w-14 h-14 rounded-full object-cover flex-shrink-0"
                            />
                        ) : (
                            <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center text-primary text-lg font-semibold flex-shrink-0">
                                {getInitials(cls.coachName)}
                            </div>
                        )}
                        <div>
                            <p className="font-semibold text-foreground">{cls.coachName}</p>
                            <p className="text-xs text-muted-foreground">Тренер</p>
                        </div>
                    </div>

                    {/* Date + time */}
                    <div className="bg-card rounded-xl p-4 space-y-2">
                        <div className="flex items-center gap-2 text-sm text-foreground">
                            <span className="text-muted-foreground">
                                {format(new Date(cls.startTime), 'd MMMM yyyy, EEEE', { locale: ru })}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                            <Clock size={15} className="text-primary" />
                            {format(new Date(cls.startTime), 'HH:mm', { locale: ru })}
                            {' – '}
                            {format(new Date(cls.endTime), 'HH:mm', { locale: ru })}
                        </div>

                        {/* Duration badge */}
                        <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 text-xs font-medium bg-muted text-muted-foreground rounded-md px-2 py-0.5">
                                <Clock size={11} />
                                {cls.durationMinutes}&nbsp;мин
                            </span>
                        </div>
                    </div>

                    {/* Status badge (if cancelled) */}
                    {cls.status === 'cancelled' && (
                        <div className="bg-error/10 border border-error/30 rounded-xl px-4 py-3">
                            <p className="text-error text-sm font-medium">Занятие отменено</p>
                        </div>
                    )}

                    {/* Remind Me toggle (hidden for past / cancelled classes per AC9) */}
                    {!isPastOrCancelled && (
                        <button
                            type="button"
                            onClick={reminder ? onUnsubscribe : onSubscribe}
                            disabled={reminderPending}
                            className={
                                reminder
                                    ? 'w-full flex items-center justify-center gap-2 border border-primary text-primary rounded-xl py-3 font-semibold text-sm transition-colors active:bg-primary/10 disabled:opacity-60'
                                    : 'w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl py-3 font-semibold text-sm transition-opacity active:opacity-80 disabled:opacity-60'
                            }
                        >
                            {reminderPending ? (
                                <span
                                    aria-hidden
                                    className={`inline-block w-4 h-4 border-2 ${
                                        reminder ? 'border-primary' : 'border-primary-foreground'
                                    } border-t-transparent rounded-full animate-spin`}
                                />
                            ) : reminder ? (
                                <BellOff size={18} />
                            ) : (
                                <Bell size={18} />
                            )}
                            {reminder ? 'Отменить напоминание' : 'Напомнить'}
                        </button>
                    )}

                    {/* Difficulty */}
                    <div className="flex items-center gap-2">
                        <DumbbellIcon size={15} className="text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Сложность:</span>
                        <span
                            className={`text-xs font-medium rounded-md px-2 py-0.5 ${
                                difficultyBadgeClass[cls.difficulty]
                            }`}
                        >
                            {difficultyLabel[cls.difficulty]}
                        </span>
                    </div>

                    {/* Impact types */}
                    {cls.impactTypes.length > 0 && (
                        <div>
                            <p className="text-sm font-semibold text-muted-foreground mb-2">Тип нагрузки</p>
                            <div className="flex flex-wrap gap-2">
                                {cls.impactTypes.map((type) =>
                                    isKnownImpactType(type) ? (
                                        <ImpactTypeBadge key={type} type={type} size="md" />
                                    ) : (
                                        <span
                                            key={type}
                                            className="text-sm text-muted-foreground bg-muted rounded-md px-2 py-0.5"
                                        >
                                            {type}
                                        </span>
                                    ),
                                )}
                            </div>
                        </div>
                    )}

                    {/* Equipment */}
                    {'equipment' in cls && Array.isArray(cls.equipment) && cls.equipment.length > 0 && (
                        <div>
                            <p className="text-sm font-semibold text-muted-foreground mb-2">Инвентарь</p>
                            <ul className="space-y-1">
                                {(cls.equipment as string[]).map((item) => (
                                    <li key={item} className="flex items-center gap-2 text-sm text-foreground">
                                        <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Description */}
                    {'description' in cls && typeof cls.description === 'string' && cls.description && (
                        <div>
                            <p className="text-sm font-semibold text-muted-foreground mb-2">Описание</p>
                            <p className="text-sm text-foreground leading-relaxed">{cls.description}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
