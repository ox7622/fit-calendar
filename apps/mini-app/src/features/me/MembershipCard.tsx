import type { IMembership } from '@/shared/api';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface IMembershipCardProps {
    membership: IMembership;
}

function formatExpiry(iso: string): string {
    const [y, m, d] = iso.split('-').map(Number);
    return format(new Date(y, m - 1, d), 'd MMMM yyyy', { locale: ru });
}

function urgencyClass(days: number): string {
    if (days <= 7) return 'bg-red-500/20 text-red-500';
    if (days <= 30) return 'bg-yellow-500/20 text-yellow-500';
    return 'bg-muted text-body-secondary';
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

export function MembershipCard({ membership }: IMembershipCardProps) {
    const frozen = isFreezeActive(membership);

    return (
        <div className="rounded-lg border border-border bg-card p-4">
            {frozen && membership.currentFreeze && (
                <div className="-mt-2 mb-3 -mx-2 rounded-md bg-yellow-500/20 px-3 py-1.5 text-sm text-yellow-500">
                    ❄️ Заморожен до {formatExpiry(membership.currentFreeze.endDate)}
                </div>
            )}
            <h2 className="heading-2">{membership.plan.name}</h2>
            <p className="text-body-secondary mt-1">Действует до {formatExpiry(membership.endDate)}</p>

            <span
                className={`mt-2 inline-block rounded-md px-2 py-0.5 text-sm ${urgencyClass(membership.daysRemaining)}`}
            >
                Осталось {pluralDays(membership.daysRemaining)}
            </span>

            {membership.plan.features.length > 0 && (
                <ul className="mt-4 space-y-1 text-body-secondary">
                    {membership.plan.features.map((f) => (
                        <li key={f} className="flex gap-2">
                            <span>•</span>
                            <span>{f}</span>
                        </li>
                    ))}
                </ul>
            )}

            {(membership.plan.guestVisitsAllowed > 0 || membership.plan.freezeDaysAllowed > 0) && (
                <div className="mt-4 grid grid-cols-2 gap-2">
                    {membership.plan.guestVisitsAllowed > 0 && (
                        <div className="rounded border border-border p-3">
                            <div className="text-2xl font-semibold">{membership.guestVisitsRemaining}</div>
                            <div className="text-xs text-body-secondary">
                                из {membership.plan.guestVisitsAllowed} гостевых
                            </div>
                        </div>
                    )}
                    {membership.plan.freezeDaysAllowed > 0 && (
                        <div className="rounded border border-border p-3">
                            <div className="text-2xl font-semibold">{membership.freezeDaysRemaining}</div>
                            <div className="text-xs text-body-secondary">
                                из {membership.plan.freezeDaysAllowed} дней заморозки
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default MembershipCard;
