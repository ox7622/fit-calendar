import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

import type { ScheduleClass } from '@/shared/types/schedule.types';

import { ImpactTypeBadge } from './ImpactTypeBadge';

interface ClassCardProps {
    class: ScheduleClass;
    onClick?: () => void;
}

type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';
type ImpactType = 'cardio' | 'strength' | 'flexibility' | 'balance';

const difficultyBadgeClass: Record<DifficultyLevel, string> = {
    beginner: 'bg-success/20 text-success',
    intermediate: 'bg-warning/20 text-warning',
    advanced: 'bg-error/20 text-error',
};

const difficultyLabel: Record<DifficultyLevel, string> = {
    beginner: 'Начальный',
    intermediate: 'Средний',
    advanced: 'Продвинутый',
};

const knownImpactTypes: ImpactType[] = ['cardio', 'strength', 'flexibility', 'balance'];

function isKnownImpactType(value: string): value is ImpactType {
    return (knownImpactTypes as string[]).includes(value);
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
    const timeRange = `${format(startDate, 'HH:mm', { locale: ru })} – ${format(endDate, 'HH:mm', { locale: ru })}`;
    const inProgress = isInProgress(cls.startTime, cls.endTime);
    const isCancelled = cls.status === 'cancelled';
    const badgeClass = difficultyBadgeClass[cls.difficulty];

    return (
        <button
            type="button"
            onClick={onClick}
            className={[
                'w-full bg-card rounded-xl shadow-sm p-4 flex gap-3 text-left',
                'transition-transform active:scale-[0.98]',
                isCancelled ? 'opacity-60' : '',
            ]
                .filter(Boolean)
                .join(' ')}
        >
            {/* Coach photo / initials */}
            <div className="flex-shrink-0">
                {cls.coachPhotoUrl ? (
                    <img src={cls.coachPhotoUrl} alt={cls.coachName} className="w-10 h-10 rounded-full object-cover" />
                ) : (
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-semibold">
                        {getInitials(cls.coachName)}
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                {/* Header row */}
                <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                        {inProgress && <span className="flex-shrink-0 w-2 h-2 rounded-full bg-success animate-pulse" />}
                        <span
                            className={['font-semibold text-foreground truncate', isCancelled ? 'line-through' : '']
                                .filter(Boolean)
                                .join(' ')}
                        >
                            {cls.name}
                        </span>
                    </div>
                    {isCancelled && <span className="flex-shrink-0 text-xs text-error font-medium">Отменено</span>}
                </div>

                {/* Time and duration */}
                <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-sm text-muted-foreground">{timeRange}</span>
                    <span className="text-xs text-muted-foreground/70 bg-muted rounded-md px-1.5 py-0.5">
                        {cls.durationMinutes}&nbsp;мин
                    </span>
                </div>

                {/* Impact type badges */}
                {cls.impactTypes.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                        {cls.impactTypes.map((type) =>
                            isKnownImpactType(type) ? (
                                <ImpactTypeBadge key={type} type={type} size="sm" />
                            ) : (
                                <span key={type} className="text-xs text-muted-foreground bg-muted rounded-md px-1.5 py-0.5">
                                    {type}
                                </span>
                            ),
                        )}
                    </div>
                )}

                {/* Bottom row: coach name + difficulty badge */}
                <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-border/50">
                    <span className="text-xs text-muted-foreground truncate">{cls.coachName}</span>
                    <span className={`flex-shrink-0 text-xs font-medium rounded-md px-1.5 py-0.5 ${badgeClass}`}>
                        {difficultyLabel[cls.difficulty]}
                    </span>
                </div>
            </div>
        </button>
    );
}
