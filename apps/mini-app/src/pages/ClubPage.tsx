import { Home } from 'lucide-react';

/**
 * ClubPage - Shows club information
 * Placeholder implementation for Story 1.5
 */
export function ClubPage(): JSX.Element {
    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="px-4 pt-4 pb-3">
                <h1 className="heading-2">Club Info</h1>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 pb-4">
                <div className="flex flex-col items-center justify-center h-full text-center">
                    <Home size={48} className="text-muted-foreground/50 mb-4" />
                    <h2 className="heading-3 mb-2">Club Info Coming Soon</h2>
                    <p className="text-body-secondary">Club details and contact information will be displayed here.</p>
                </div>
            </div>
        </div>
    );
}
