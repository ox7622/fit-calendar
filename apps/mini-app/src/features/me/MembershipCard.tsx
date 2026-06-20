import type { IMembership } from '@/shared/api';
import { differenceInCalendarDays, format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Check, Snowflake } from 'lucide-react';

interface IMembershipCardProps {
    membership: IMembership;
}

function parseLocalDate(iso: string): Date {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y ?? 0, (m ?? 1) - 1, d ?? 1);
}

function formatDay(iso: string): string {
    return format(parseLocalDate(iso), 'd MMM', { locale: ru });
}

function pluralDays(n: number): string {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return `${n} день`;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return `${n} дня`;
    return `${n} дней`;
}

function isFreezeActive(membership: IMembership, now: Date = new Date()): boolean {
    if (!membership.currentFreeze) return false;
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(
        2,
        '0',
    )}`;
    return membership.currentFreeze.startDate <= today && today <= membership.currentFreeze.endDate;
}

const heroGradient = 'linear-gradient(135deg, hsl(var(--hero-from)), hsl(var(--hero-to)))';

export function MembershipCard({ membership }: IMembershipCardProps) {
    const frozen = isFreezeActive(membership);
    const { plan } = membership;
    const hasCounters = plan.guestVisitsAllowed > 0 || plan.freezeDaysAllowed > 0;

    // Progress ring: share of the membership window still remaining.
    const totalDays = Math.max(
        1,
        differenceInCalendarDays(parseLocalDate(membership.endDate), parseLocalDate(membership.startDate)),
    );
    const remainingPct = Math.max(0, Math.min(100, Math.round((membership.daysRemaining / totalDays) * 100)));

    return (
        <div
            className="relative overflow-hidden rounded-[18px] p-5 text-white shadow-lg"
            style={{ background: heroGradient }}
        >
            {frozen && membership.currentFreeze && (
                <div className="-mx-5 -mt-5 mb-4 flex items-center gap-1.5 bg-warning px-5 py-2 text-sm font-medium text-black">
                    <Snowflake size={14} />
                    Заморожен до {formatDay(membership.currentFreeze.endDate)}
                </div>
            )}

            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <h2 className="text-xl font-bold leading-tight">{plan.name}</h2>
                    <p className="mt-1 text-sm text-white/70">
                        Действует до <span className="font-mono">{formatDay(membership.endDate)}</span>
                    </p>
                </div>

                {/* Progress ring */}
                <div
                    className="relative flex h-[68px] w-[68px] flex-shrink-0 items-center justify-center rounded-full"
                    style={{ background: `conic-gradient(#fff ${remainingPct}%, rgba(255,255,255,0.22) 0)` }}
                >
                    <div
                        className="absolute inset-[5px] flex flex-col items-center justify-center rounded-full"
                        style={{ background: 'hsl(var(--hero-to))' }}
                    >
                        <span className="text-lg font-bold leading-none">{membership.daysRemaining}</span>
                        <span className="text-[10px] text-white/70">дн.</span>
                    </div>
                </div>
            </div>

            {plan.features.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                    {plan.features.map((f) => (
                        <span
                            key={f}
                            className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-1 text-xs"
                        >
                            <Check size={11} />
                            {f}
                        </span>
                    ))}
                </div>
            )}

            {hasCounters && (
                <div className="mt-4 grid grid-cols-2 gap-2">
                    {plan.guestVisitsAllowed > 0 && (
                        <div className="rounded-xl bg-white/10 p-3">
                            <div className="text-2xl font-bold leading-none">
                                {membership.guestVisitsRemaining}
                                <span className="text-sm font-medium text-white/60"> / {plan.guestVisitsAllowed}</span>
                            </div>
                            <div className="mt-1 text-xs text-white/70">гостевых</div>
                        </div>
                    )}
                    {plan.freezeDaysAllowed > 0 && (
                        <div className="rounded-xl bg-white/10 p-3">
                            <div className="text-2xl font-bold leading-none">
                                {membership.freezeDaysRemaining}
                                <span className="text-sm font-medium text-white/60"> / {plan.freezeDaysAllowed}</span>
                            </div>
                            <div className="mt-1 text-xs text-white/70">дн. заморозки</div>
                        </div>
                    )}
                </div>
            )}

            <p className="mt-4 text-xs text-white/50">Осталось {pluralDays(membership.daysRemaining)}</p>
        </div>
    );
}

export default MembershipCard;
