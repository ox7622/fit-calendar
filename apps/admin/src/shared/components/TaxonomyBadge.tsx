import type { TTaxonomyColor } from '@fitcalendar/shared';

/** The closed taxonomy palette → concrete classes. Written as literal strings so
 *  Tailwind picks them up. Solid swatch for the colour picker, soft pill for badges. */
export const TAXONOMY_COLOR_SWATCH: Record<TTaxonomyColor, string> = {
    green: 'bg-green-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
    orange: 'bg-orange-500',
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
    slate: 'bg-slate-500',
    teal: 'bg-teal-500',
};

export const TAXONOMY_COLOR_BADGE: Record<TTaxonomyColor, string> = {
    green: 'bg-green-500/15 text-green-500',
    amber: 'bg-amber-500/15 text-amber-600',
    red: 'bg-red-500/15 text-red-500',
    orange: 'bg-orange-500/15 text-orange-500',
    blue: 'bg-blue-500/15 text-blue-500',
    purple: 'bg-purple-500/15 text-purple-500',
    slate: 'bg-slate-500/15 text-slate-400',
    teal: 'bg-teal-500/15 text-teal-500',
};

/** Soft coloured pill for a difficulty level / impact type. `color` may be a
 *  stale token if the source row was edited; we fall back to slate. */
export function TaxonomyBadge({
    label,
    color,
    muted,
    className,
}: {
    label: string;
    color: TTaxonomyColor | string;
    muted?: boolean;
    className?: string;
}): JSX.Element {
    const palette = TAXONOMY_COLOR_BADGE[color as TTaxonomyColor] ?? TAXONOMY_COLOR_BADGE.slate;
    return (
        <span className={`rounded px-2 py-0.5 text-xs ${palette} ${muted ? 'opacity-50' : ''} ${className ?? ''}`}>
            {label}
        </span>
    );
}

export default TaxonomyBadge;
