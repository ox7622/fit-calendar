import { MapPin, Phone } from 'lucide-react';
import { useEffect, useState } from 'react';

import { clubApi } from '@/shared/api/club.api';
import type { ClubInfo, WorkingHoursEntry } from '@/shared/api/club.api';

const DAY_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

const DAY_LABELS: Record<string, string> = {
    Mon: 'Пн',
    Tue: 'Вт',
    Wed: 'Ср',
    Thu: 'Чт',
    Fri: 'Пт',
    Sat: 'Сб',
    Sun: 'Вс',
};

function isWorkingHoursEntry(value: WorkingHoursEntry | null | undefined): value is WorkingHoursEntry {
    return value !== null && value !== undefined && typeof value === 'object';
}

function openMap(club: ClubInfo): void {
    const url =
        club.latitude !== null && club.longitude !== null
            ? `https://maps.google.com/?q=${club.latitude},${club.longitude}`
            : `https://maps.google.com/?q=${encodeURIComponent(club.address)}`;
    window.open(url);
}

function ClubSkeleton(): JSX.Element {
    const shimmer =
        'bg-gradient-to-r from-muted via-muted-foreground/10 to-muted bg-[length:200%_100%] animate-[shimmer_1.5s_infinite_linear] rounded-md';
    return (
        <div className="flex flex-col h-full">
            <div className="px-4 pt-4 pb-3">
                <div className={`h-7 w-48 ${shimmer}`} />
            </div>
            <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-5">
                <div className={`h-5 w-full ${shimmer}`} />
                <div className={`h-5 w-2/3 ${shimmer}`} />
                <div className="space-y-2">
                    {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                        <div key={i} className="flex justify-between">
                            <div className={`h-4 w-8 ${shimmer}`} />
                            <div className={`h-4 w-32 ${shimmer}`} />
                        </div>
                    ))}
                </div>
                <div className={`h-11 w-full rounded-xl ${shimmer}`} />
            </div>
        </div>
    );
}

/**
 * ClubPage — Shows club information and location
 * Stories 4.4 & 4.5
 */
export function ClubPage(): JSX.Element {
    const [club, setClub] = useState<ClubInfo | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        setIsLoading(true);
        setError(null);

        clubApi
            .getInfo()
            .then((data) => {
                if (!cancelled) {
                    setClub(data);
                    setIsLoading(false);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setError('Не удалось загрузить информацию о клубе');
                    setIsLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, []);

    if (isLoading) {
        return <ClubSkeleton />;
    }

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="px-4 pt-4 pb-3">
                <h1 className="heading-2">{club ? club.name : 'Информация о клубе'}</h1>
            </div>

            {error || !club ? (
                <div className="flex-1 flex flex-col items-center justify-center px-4 pb-4 text-center">
                    <p className="text-error text-sm mb-3">{error ?? 'Информация о клубе не найдена'}</p>
                    <button
                        type="button"
                        onClick={() => {
                            setIsLoading(true);
                            setError(null);
                            clubApi
                                .getInfo()
                                .then(setClub)
                                .catch(() => setError('Не удалось загрузить информацию о клубе'))
                                .finally(() => setIsLoading(false));
                        }}
                        className="text-sm text-primary underline"
                    >
                        Повторить
                    </button>
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-5 animate-[fade-in_0.15s_ease-out]">
                    {/* Address */}
                    <div className="flex items-start gap-2">
                        <MapPin size={18} className="text-primary flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-foreground">{club.address}</p>
                    </div>

                    {/* Phone */}
                    {club.phone && (
                        <div className="flex items-center gap-2">
                            <Phone size={18} className="text-primary flex-shrink-0" />
                            <a href={`tel:${club.phone}`} className="text-sm text-primary underline">
                                {club.phone}
                            </a>
                        </div>
                    )}

                    {/* Working hours */}
                    {Object.keys(club.workingHours).length > 0 && (
                        <div>
                            <p className="text-sm font-semibold text-muted-foreground mb-2">Часы работы</p>
                            <div className="bg-card rounded-xl p-4 space-y-2">
                                {DAY_ORDER.map((day) => {
                                    const hours = club.workingHours[day];
                                    const label = DAY_LABELS[day] ?? day;
                                    return (
                                        <div key={day} className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground w-7">{label}</span>
                                            {isWorkingHoursEntry(hours) ? (
                                                <span className="text-foreground">
                                                    {hours.open} – {hours.close}
                                                </span>
                                            ) : (
                                                <span className="text-muted-foreground/60">Выходной</span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Show on map button */}
                    <button
                        type="button"
                        onClick={() => openMap(club)}
                        className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl py-3 font-semibold text-sm transition-opacity active:opacity-80"
                    >
                        <MapPin size={18} />
                        Показать на карте
                    </button>
                </div>
            )}
        </div>
    );
}
