import { formatDuration, formatPriceRub } from '@fitcalendar/shared';
import { ArrowLeft, Check } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { membershipPlansApi, type PlanCard } from '@/shared/api';
import { clubApi } from '@/shared/api/club.api';
import type { ClubInfo } from '@/shared/api/club.api';

function PlanCardSkeleton(): JSX.Element {
    const shimmer =
        'bg-gradient-to-r from-muted via-muted-foreground/10 to-muted bg-[length:200%_100%] animate-[shimmer_1.5s_infinite_linear] rounded-md';
    return (
        <div className="rounded-2xl border border-border p-4 space-y-3">
            <div className={`h-6 w-2/3 ${shimmer}`} />
            <div className={`h-4 w-1/3 ${shimmer}`} />
            <div className={`h-7 w-1/2 ${shimmer}`} />
            <div className={`h-4 w-3/4 ${shimmer}`} />
            <div className={`h-4 w-2/3 ${shimmer}`} />
        </div>
    );
}

function PlanCardView({ plan }: { plan: PlanCard }): JSX.Element {
    const durationLabel = formatDuration(plan.durationValue, plan.durationUnit);
    const priceLabel = formatPriceRub(plan.priceRub);

    return (
        <article className="rounded-2xl border border-border bg-card p-4">
            <h2 className="heading-2 text-foreground">{plan.name}</h2>
            <p className="text-sm text-muted-foreground mt-1">{durationLabel}</p>
            <p className="text-[26px] font-extrabold leading-tight text-foreground mt-3">{priceLabel}</p>

            {plan.features.length > 0 && (
                <ul className="mt-3 space-y-1.5 text-sm text-foreground">
                    {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2">
                            <Check size={16} className="mt-0.5 flex-shrink-0 text-primary" />
                            <span>{feature}</span>
                        </li>
                    ))}
                </ul>
            )}

            {(plan.guestVisitsAllowed > 0 || plan.freezeDaysAllowed > 0) && (
                <div className="mt-3 flex flex-wrap gap-2">
                    {plan.guestVisitsAllowed > 0 && (
                        <span className="rounded-full bg-primary/10 text-primary text-xs font-medium px-2.5 py-1">
                            Гостевые визиты: {plan.guestVisitsAllowed}
                        </span>
                    )}
                    {plan.freezeDaysAllowed > 0 && (
                        <span className="rounded-full bg-primary/10 text-primary text-xs font-medium px-2.5 py-1">
                            Заморозка: {formatDuration(plan.freezeDaysAllowed, 'day')}
                        </span>
                    )}
                </div>
            )}
        </article>
    );
}

/**
 * PlansPage — public catalog of active membership plans.
 * Story 7.1
 */
export function PlansPage(): JSX.Element {
    const navigate = useNavigate();
    const [plans, setPlans] = useState<PlanCard[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [club, setClub] = useState<ClubInfo | null>(null);

    // Club header — this screen is a subpage of the club, so it wears the club's name.
    useEffect(() => {
        let cancelled = false;
        clubApi
            .getInfo()
            .then((data) => {
                if (!cancelled) setClub(data);
            })
            .catch(() => {
                // Header name is non-critical; fall back to a generic label.
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const load = (): void => {
        setIsLoading(true);
        setError(null);
        membershipPlansApi
            .getList()
            .then((data) => {
                setPlans(data);
                setIsLoading(false);
            })
            .catch(() => {
                setError('Не удалось загрузить абонементы');
                setIsLoading(false);
            });
    };

    useEffect(() => {
        let cancelled = false;
        membershipPlansApi
            .getList()
            .then((data) => {
                if (!cancelled) {
                    setPlans(data);
                    setIsLoading(false);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setError('Не удалось загрузить абонементы');
                    setIsLoading(false);
                }
            });
        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <div className="flex flex-col h-full">
            <div className="px-4 pt-4 pb-3 flex items-center gap-3">
                <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                    aria-label="Назад"
                >
                    <ArrowLeft size={20} />
                </button>
                <h1 className="heading-1 truncate">{club?.name ?? 'Клуб'}</h1>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
                <p className="text-sm font-semibold text-muted-foreground">Абонементы</p>
                {isLoading ? (
                    <>
                        <PlanCardSkeleton />
                        <PlanCardSkeleton />
                        <PlanCardSkeleton />
                    </>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                        <p className="text-error text-sm mb-3">{error}</p>
                        <button type="button" onClick={load} className="text-sm text-primary underline">
                            Повторить
                        </button>
                    </div>
                ) : plans.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                        <p className="text-muted-foreground text-sm">Планы скоро появятся</p>
                    </div>
                ) : (
                    plans.map((plan) => <PlanCardView key={plan.id} plan={plan} />)
                )}
            </div>
        </div>
    );
}
