import { formatInClubTz } from '@fitcalendar/shared';
import { useTaxonomyStore } from '@/shared/stores';
import { useClubTimeZone } from '@/shared/club-timezone';
import type { ScheduleClass } from '@/shared/types/schedule.types';

import { TaxonomyBadge } from './TaxonomyBadge';

interface ClassCardProps {
    class: ScheduleClass;
    onClick?: () => void;
}

function getInitials(name: string): string {
    return name
        .split(' ')
        .map((part) => part[0] ?? '')
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

function isInProgress(startTime: string, endTime: string): boolean {
    const now = Date.now();
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    return now >= start && now < end;
}

export function ClassCard({ class: cls, onClick }: ClassCardProps): JSX.Element {
    const tz = useClubTimeZone();
    const endDate = new Date(cls.endTime);
    const timeRange = `${formatInClubTz(cls.startTime, tz, 'HH:mm')}–${formatInClubTz(cls.endTime, tz, 'HH:mm')}`;
    const inProgress = isInProgress(cls.startTime, cls.endTime);
    const isPast = endDate.getTime() < Date.now();
    const isCancelled = cls.status === 'cancelled';
    const difficultyMap = useTaxonomyStore((s) => s.difficultyMap);
    const impactMap = useTaxonomyStore((s) => s.impactMap);
    const difficulty = difficultyMap[cls.difficulty];

    return (
        <button
            type="button"
            onClick={onClick}
            className={[
                'w-full bg-card rounded-[14px] shadow-sm p-3.5 flex gap-3 text-left',
                'transition-transform active:scale-[0.98]',
                isCancelled ? 'opacity-60' : isPast ? 'opacity-50' : '',
            ]
                .filter(Boolean)
                .join(' ')}
        >
            {/* Coach photo / initials — 42px */}
            <div className="flex-shrink-0">
                {cls.coachPhotoUrl ? (
                    <img
                        src={cls.coachPhotoUrl}
                        alt={cls.coachName}
                        className="w-[42px] h-[42px] rounded-full object-cover"
                    />
                ) : (
                    <div className="w-[42px] h-[42px] rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-semibold">
                        {getInitials(cls.coachName)}
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                {/* Header row: name + difficulty / cancelled badge */}
                <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                        {inProgress && <span className="flex-shrink-0 w-2 h-2 rounded-full bg-success animate-pulse" />}
                        <span
                            className={['heading-3 truncate', isCancelled ? 'line-through' : '']
                                .filter(Boolean)
                                .join(' ')}
                        >
                            {cls.name}
                        </span>
                    </div>
                    {isCancelled ? (
                        <span className="flex-shrink-0 text-xs font-medium rounded-md px-1.5 py-0.5 bg-error/20 text-error">
                            Отменено
                        </span>
                    ) : (
                        <TaxonomyBadge
                            label={difficulty?.label ?? cls.difficulty}
                            color={difficulty?.color ?? 'slate'}
                            className="flex-shrink-0"
                        />
                    )}
                </div>

                {/* Time and duration */}
                <div className="flex items-center gap-2 mt-1">
                    <span className="font-mono text-sm text-muted-foreground tracking-tight">{timeRange}</span>
                    <span className="text-xs text-muted-foreground/70 bg-muted rounded-md px-1.5 py-0.5">
                        {cls.durationMinutes}&nbsp;мин
                    </span>
                </div>

                {/* Impact type badges */}
                {cls.impactTypes.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                        {cls.impactTypes.map((key) => {
                            const impact = impactMap[key];
                            return (
                                <TaxonomyBadge
                                    key={key}
                                    label={impact?.label ?? key}
                                    color={impact?.color ?? 'slate'}
                                    iconKey={key}
                                    size="sm"
                                />
                            );
                        })}
                    </div>
                )}

                {/* Footer: mini coach avatar + name over border-top */}
                <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-border/50">
                    {cls.coachPhotoUrl ? (
                        <img
                            src={cls.coachPhotoUrl}
                            alt=""
                            className="w-[18px] h-[18px] rounded-full object-cover flex-shrink-0"
                        />
                    ) : (
                        <div className="w-[18px] h-[18px] rounded-full bg-primary/20 flex items-center justify-center text-primary text-[9px] font-semibold flex-shrink-0">
                            {getInitials(cls.coachName)}
                        </div>
                    )}
                    <span className="text-xs text-muted-foreground truncate">{cls.coachName}</span>
                </div>
            </div>
        </button>
    );
}
