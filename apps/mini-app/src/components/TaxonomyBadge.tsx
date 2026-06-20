import type { ComponentType, JSX } from 'react';

import { Activity, Dumbbell, Flame, Scale } from 'lucide-react';

/** Taxonomy palette token → classes. Unknown/stale tokens fall back to slate. */
const COLOR_BADGE: Record<string, string> = {
    green: 'bg-green-500/20 text-green-400',
    amber: 'bg-amber-500/20 text-amber-400',
    red: 'bg-red-500/20 text-red-400',
    orange: 'bg-orange-500/20 text-orange-400',
    blue: 'bg-blue-500/20 text-blue-400',
    purple: 'bg-purple-500/20 text-purple-400',
    slate: 'bg-slate-500/20 text-slate-300',
    teal: 'bg-teal-500/20 text-teal-400',
};

/** Cosmetic icons for the default impact keys; custom keys simply render without one. */
const ICON_BY_KEY: Record<string, ComponentType<{ size?: number; className?: string }>> = {
    cardio: Flame,
    strength: Dumbbell,
    flexibility: Activity,
    balance: Scale,
};

interface TaxonomyBadgeProps {
    label: string;
    color: string;
    /** Taxonomy key — used only to pick an optional icon. */
    iconKey?: string;
    size?: 'sm' | 'md';
    className?: string;
}

/** Soft coloured pill for a difficulty level / impact type, themed from the
 *  taxonomy palette token rather than a hardcoded per-key map. */
export function TaxonomyBadge({ label, color, iconKey, size = 'sm', className }: TaxonomyBadgeProps): JSX.Element {
    const palette = COLOR_BADGE[color] ?? COLOR_BADGE.slate;
    const Icon = iconKey ? ICON_BY_KEY[iconKey] : undefined;
    const iconSize = size === 'sm' ? 10 : 12;
    const textClass = size === 'sm' ? 'text-xs' : 'text-sm';

    return (
        <span
            className={[
                'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-medium',
                textClass,
                palette,
                className ?? '',
            ].join(' ')}
        >
            {Icon && <Icon size={iconSize} />}
            {label}
        </span>
    );
}

export default TaxonomyBadge;
