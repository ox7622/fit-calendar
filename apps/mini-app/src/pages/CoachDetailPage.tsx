import { ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { coachesApi } from '@/shared/api';
import type { CoachDetail } from '@/shared/api/coaches.api';

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
            <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-5">
                {/* Avatar */}
                <div className="flex flex-col items-center gap-3 pt-2">
                    <div className={`w-28 h-28 rounded-full ${shimmer}`} />
                    <div className={`h-6 w-40 ${shimmer}`} />
                </div>
                {/* Bio */}
                <div className="space-y-2">
                    <div className={`h-4 w-full ${shimmer}`} />
                    <div className={`h-4 w-4/5 ${shimmer}`} />
                    <div className={`h-4 w-3/5 ${shimmer}`} />
                </div>
                {/* Tags */}
                <div className="flex gap-2">
                    <div className={`h-6 w-20 ${shimmer}`} />
                    <div className={`h-6 w-24 ${shimmer}`} />
                </div>
                {/* Button */}
                <div className={`h-11 w-full rounded-xl ${shimmer}`} />
            </div>
        </div>
    );
}

/**
 * CoachDetailPage — Full coach profile
 * Story 4.2
 */
export function CoachDetailPage(): JSX.Element {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [coach, setCoach] = useState<CoachDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!id) {
            setError('Некорректный идентификатор тренера');
            setIsLoading(false);
            return;
        }

        let cancelled = false;
        setIsLoading(true);
        setError(null);

        coachesApi
            .getById(id)
            .then((data) => {
                if (!cancelled) {
                    setCoach(data);
                    setIsLoading(false);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setError('Не удалось загрузить информацию о тренере');
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
                <h1 className="heading-2 truncate">{coach ? coach.name : 'Тренер'}</h1>
            </div>

            {error || !coach ? (
                <div className="flex-1 flex flex-col items-center justify-center px-4 pb-4 text-center">
                    <p className="text-error text-sm mb-3">{error ?? 'Тренер не найден'}</p>
                    <button type="button" onClick={() => navigate(-1)} className="text-sm text-primary underline">
                        Вернуться назад
                    </button>
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-5 animate-[fade-in_0.15s_ease-out]">
                    {/* Large avatar */}
                    <div className="flex flex-col items-center gap-3 pt-2">
                        {coach.photoUrl ? (
                            <img
                                src={coach.photoUrl}
                                alt={coach.name}
                                className="w-28 h-28 rounded-full object-cover"
                            />
                        ) : (
                            <div className="w-28 h-28 rounded-full bg-primary/20 flex items-center justify-center text-primary text-2xl font-semibold">
                                {getInitials(coach.name)}
                            </div>
                        )}
                        <h2 className="heading-1 text-center">{coach.name}</h2>
                    </div>

                    {/* Bio */}
                    {coach.bio && (
                        <div>
                            <p className="text-sm font-semibold text-muted-foreground mb-2">О тренере</p>
                            <p className="text-sm text-foreground leading-relaxed">{coach.bio}</p>
                        </div>
                    )}

                    {/* Specializations */}
                    {coach.specializations.length > 0 && (
                        <div>
                            <p className="text-sm font-semibold text-muted-foreground mb-2">Специализация</p>
                            <div className="flex flex-wrap gap-2">
                                {coach.specializations.map((spec) => (
                                    <span
                                        key={spec}
                                        className="text-sm bg-primary/10 text-primary rounded-full px-3 py-1"
                                    >
                                        {spec}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Certifications */}
                    {coach.certifications.length > 0 && (
                        <div>
                            <p className="text-sm font-semibold text-muted-foreground mb-2">Сертификаты</p>
                            <ul className="space-y-1.5">
                                {coach.certifications.map((cert) => (
                                    <li key={cert} className="flex items-start gap-2 text-sm text-foreground">
                                        <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                                        {cert}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Schedule button */}
                    <button
                        type="button"
                        onClick={() => navigate(`/coaches/${coach.id}/schedule`)}
                        className="w-full bg-primary text-primary-foreground rounded-xl py-3 font-semibold text-sm transition-opacity active:opacity-80"
                    >
                        Расписание тренера
                    </button>
                </div>
            )}
        </div>
    );
}
