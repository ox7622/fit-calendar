import { DIFFICULTY_LEVEL_LABELS, IMPACT_TYPES, type TDifficultyLevel, type TImpactType } from '@fitcalendar/shared';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

import type { ScheduleClass } from '@/shared/types/schedule.types';

import { ImpactTypeBadge } from './ImpactTypeBadge';

interface ClassCardProps {
    class: ScheduleClass;
    onClick?: () => void;
}

const difficultyBadgeClass: Record<TDifficultyLevel, string> = {
    beginner: 'bg-success/20 text-success',
    intermediate: 'bg-warning/20 text-warning',
    advanced: 'bg-error/20 text-error',
};

const difficultyLabel = DIFFICULTY_LEVEL_LABELS;

function isKnownImpactType(value: string): value is TImpactType {
    return (IMPACT_TYPES as readonly string[]).includes(value);
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
    const startDate = new Date(cls.startTime);
    const endDate = new Date(cls.endTime);
    const timeRange = `${format(startDate, 'HH:mm', { locale: ru })}–${format(endDate, 'HH:mm', { locale: ru })}`;
    const inProgress = isInProgress(cls.startTime, cls.endTime);
    const isPast = endDate.getTime() < Date.now();
    const isCancelled = cls.status === 'cancelled';
    const badgeClass = difficultyBadgeClass[cls.difficulty];

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
                        <span className={`flex-shrink-0 text-xs font-medium rounded-md px-1.5 py-0.5 ${badgeClass}`}>
                            {difficultyLabel[cls.difficulty]}
                        </span>
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
                        {cls.impactTypes.map((type) =>
                            isKnownImpactType(type) ? (
                                <ImpactTypeBadge key={type} type={type} size="sm" />
                            ) : (
                                <span
                                    key={type}
                                    className="text-xs text-muted-foreground bg-muted rounded-md px-1.5 py-0.5"
                                >
                                    {type}
                                </span>
                            ),
                        )}
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
