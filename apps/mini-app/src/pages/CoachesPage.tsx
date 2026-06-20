import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { coachesApi } from '@/shared/api';
import type { CoachOption } from '@/shared/types/filter.types';

function getInitials(name: string): string {
    return name
        .split(' ')
        .map((part) => part[0] ?? '')
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

function CoachRowSkeleton(): JSX.Element {
    const shimmer =
        'bg-gradient-to-r from-muted via-muted-foreground/10 to-muted bg-[length:200%_100%] animate-[shimmer_1.5s_infinite_linear] rounded-md';
    return (
        <div className="flex items-center gap-3 py-3 px-1">
            <div className={`w-12 h-12 rounded-full flex-shrink-0 ${shimmer}`} />
            <div className="flex-1 space-y-2">
                <div className={`h-4 w-1/2 ${shimmer}`} />
                <div className={`h-3 w-1/3 ${shimmer}`} />
            </div>
        </div>
    );
}

/**
 * CoachesPage — Shows list of active coaches
 * Story 4.1
 */
export function CoachesPage(): JSX.Element {
    const navigate = useNavigate();

    const [coaches, setCoaches] = useState<CoachOption[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        setIsLoading(true);
        setError(null);

        coachesApi
            .getList()
            .then((data) => {
                if (!cancelled) {
                    setCoaches(data);
                    setIsLoading(false);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setError('Не удалось загрузить список тренеров');
                    setIsLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="px-4 pt-4 pb-3">
                <h1 className="heading-2">Тренеры</h1>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 pb-4">
                {isLoading ? (
                    <div className="divide-y divide-border">
                        {[1, 2, 3].map((i) => (
                            <CoachRowSkeleton key={i} />
                        ))}
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center h-full text-center py-8">
                        <p className="text-error text-sm mb-3">{error}</p>
                        <button
                            type="button"
                            onClick={() => {
                                setIsLoading(true);
                                setError(null);
                                coachesApi
                                    .getList()
                                    .then(setCoaches)
                                    .catch(() => setError('Не удалось загрузить список тренеров'))
                                    .finally(() => setIsLoading(false));
                            }}
                            className="text-sm text-primary underline"
                        >
                            Повторить
                        </button>
                    </div>
                ) : coaches.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center py-8">
                        <p className="text-muted-foreground text-sm">Тренеры не найдены</p>
                    </div>
                ) : (
                    <div className="divide-y divide-border">
                        {coaches.map((coach) => (
                            <button
                                key={coach.id}
                                type="button"
                                onClick={() => navigate(`/coaches/${coach.id}`)}
                                className="w-full flex items-center gap-3 py-3 px-1 text-left transition-colors hover:bg-muted/50 active:bg-muted rounded-lg"
                            >
                                {/* Avatar */}
                                <div className="flex-shrink-0">
                                    {coach.photoUrl ? (
                                        <img
                                            src={coach.photoUrl}
                                            alt={coach.name}
                                            className="w-12 h-12 rounded-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-semibold">
                                            {getInitials(coach.name)}
                                        </div>
                                    )}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-foreground truncate">{coach.name}</p>
                                    {coach.specializations && coach.specializations.length > 0 && (
                                        <p className="text-sm text-muted-foreground truncate">
                                            {coach.specializations[0]}
                                        </p>
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
