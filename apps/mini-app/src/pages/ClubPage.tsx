import { CreditCard, MapPin, Phone } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { clubApi } from '@/shared/api/club.api';
import type { ClubInfo, WorkingHoursEntry } from '@/shared/api/club.api';

// Day keys are stored lowercase (monday…); the no-record stub uses short
// capitalised forms (Mon…) — accept both per day.
const DAY_DEFS: Array<{ label: string; keys: string[] }> = [
    { label: 'Пн', keys: ['monday', 'Mon'] },
    { label: 'Вт', keys: ['tuesday', 'Tue'] },
    { label: 'Ср', keys: ['wednesday', 'Wed'] },
    { label: 'Чт', keys: ['thursday', 'Thu'] },
    { label: 'Пт', keys: ['friday', 'Fri'] },
    { label: 'Сб', keys: ['saturday', 'Sat'] },
    { label: 'Вс', keys: ['sunday', 'Sun'] },
];

function isWorkingHoursEntry(value: WorkingHoursEntry | null | undefined): value is WorkingHoursEntry {
    return value !== null && value !== undefined && typeof value === 'object';
}

/** Condenses the week into ranges of identical days, e.g. "Пн–Пт" → "07:00–23:00". */
function getWorkingHoursRows(hours: Record<string, WorkingHoursEntry | null>): Array<{ label: string; value: string }> {
    const perDay = DAY_DEFS.map(({ label, keys }) => {
        const key = keys.find((k) => hours[k] !== undefined);
        const entry = key ? hours[key] : undefined;
        return { label, value: isWorkingHoursEntry(entry) ? `${entry.open}–${entry.close}` : 'Выходной' };
    });

    const groups: Array<{ from: string; to: string; value: string }> = [];
    for (const day of perDay) {
        const last = groups[groups.length - 1];
        if (last && last.value === day.value) last.to = day.label;
        else groups.push({ from: day.label, to: day.label, value: day.value });
    }

    return groups.map((g) => ({ label: g.from === g.to ? g.from : `${g.from}–${g.to}`, value: g.value }));
}

function openMap(club: ClubInfo): void {
    const url = club.mapUrl ?? `https://yandex.ru/maps/?text=${encodeURIComponent(club.address)}`;
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
                <h1 className="heading-1">{club ? club.name : 'Информация о клубе'}</h1>
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
                            <a href={`tel:${club.phone}`} className="font-mono text-sm text-primary">
                                {club.phone}
                            </a>
                        </div>
                    )}

                    {/* Working hours */}
                    {Object.keys(club.workingHours).length > 0 && (
                        <div>
                            <p className="text-sm font-semibold text-muted-foreground mb-2">Часы работы</p>
                            <div className="bg-card rounded-xl p-4 space-y-2">
                                {getWorkingHoursRows(club.workingHours).map((row) => (
                                    <div key={row.label} className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">{row.label}</span>
                                        {row.value === 'Выходной' ? (
                                            <span className="text-muted-foreground/60">Выходной</span>
                                        ) : (
                                            <span className="font-mono text-foreground">{row.value}</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Plans link */}
                    <Link
                        to="/plans"
                        className="w-full flex items-center justify-center gap-2 border border-primary text-primary rounded-xl py-3 font-semibold text-sm transition-colors active:bg-primary/10"
                    >
                        <CreditCard size={18} />
                        Доступные абонементы
                    </Link>

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
