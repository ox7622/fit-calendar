import { Activity, Dumbbell, Flame, Scale } from 'lucide-react';
import type { JSX } from 'react';

type ImpactType = 'cardio' | 'strength' | 'flexibility' | 'balance';

interface ImpactTypeBadgeProps {
    type: ImpactType;
    size?: 'sm' | 'md';
}

const impactConfig: Record<
    ImpactType,
    { label: string; colorClass: string; Icon: React.ComponentType<{ size?: number; className?: string }> }
> = {
    cardio: {
        label: 'Кардио',
        colorClass: 'bg-orange-500/20 text-orange-400',
        Icon: Flame,
    },
    strength: {
        label: 'Силовая',
        colorClass: 'bg-red-500/20 text-red-400',
        Icon: Dumbbell,
    },
    flexibility: {
        label: 'Гибкость',
        colorClass: 'bg-green-500/20 text-green-400',
        Icon: Activity,
    },
    balance: {
        label: 'Баланс',
        colorClass: 'bg-blue-500/20 text-blue-400',
        Icon: Scale,
    },
};

export function ImpactTypeBadge({ type, size = 'sm' }: ImpactTypeBadgeProps): JSX.Element {
    const config = impactConfig[type];
    const iconSize = size === 'sm' ? 10 : 12;
    const textClass = size === 'sm' ? 'text-xs' : 'text-sm';

    return (
        <span
            className={[
                'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-medium',
                textClass,
                config.colorClass,
            ].join(' ')}
        >
            <config.Icon size={iconSize} />
            {config.label}
        </span>
    );
}
