import { Bell } from 'lucide-react';

/**
 * RemindersPage - Shows user's class reminders
 * Placeholder implementation for Story 1.5
 */
export function RemindersPage(): JSX.Element {
    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="px-4 pt-4 pb-3">
                <h1 className="heading-2">Reminders</h1>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 pb-4">
                <div className="flex flex-col items-center justify-center h-full text-center">
                    <Bell size={48} className="text-muted-foreground/50 mb-4" />
                    <h2 className="heading-3 mb-2">No Reminders Yet</h2>
                    <p className="text-body-secondary">Your class reminders will appear here.</p>
                </div>
            </div>
        </div>
    );
}
