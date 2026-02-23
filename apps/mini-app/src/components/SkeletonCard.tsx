export function SkeletonCard(): JSX.Element {
    return (
        <div className="w-full bg-card rounded-xl shadow-sm p-4 flex gap-3">
            {/* Avatar skeleton */}
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-r from-muted via-muted-foreground/10 to-muted bg-[length:200%_100%] animate-[shimmer_1.5s_infinite_linear]" />

            {/* Content skeleton */}
            <div className="flex-1 space-y-2">
                {/* Title */}
                <div className="h-4 w-3/4 rounded-md bg-gradient-to-r from-muted via-muted-foreground/10 to-muted bg-[length:200%_100%] animate-[shimmer_1.5s_infinite_linear]" />
                {/* Time */}
                <div className="h-3 w-1/2 rounded-md bg-gradient-to-r from-muted via-muted-foreground/10 to-muted bg-[length:200%_100%] animate-[shimmer_1.5s_infinite_linear]" />
                {/* Bottom row */}
                <div className="flex justify-between mt-1.5 pt-1.5 border-t border-border/50">
                    <div className="h-3 w-1/3 rounded-md bg-gradient-to-r from-muted via-muted-foreground/10 to-muted bg-[length:200%_100%] animate-[shimmer_1.5s_infinite_linear]" />
                    <div className="h-3 w-1/5 rounded-md bg-gradient-to-r from-muted via-muted-foreground/10 to-muted bg-[length:200%_100%] animate-[shimmer_1.5s_infinite_linear]" />
                </div>
            </div>
        </div>
    );
}
