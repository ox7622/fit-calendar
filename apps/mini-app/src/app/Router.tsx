import { Routes, Route, Navigate } from 'react-router-dom';
import { SchedulePage, CoachesPage, RemindersPage, ClubPage } from '@/pages';
import { AppShell } from './components';

/**
 * App Router with all route definitions
 */
export function AppRouter(): JSX.Element {
    return (
        <AppShell>
            <Routes>
                <Route path="/" element={<SchedulePage />} />
                <Route path="/coaches" element={<CoachesPage />} />
                <Route path="/reminders" element={<RemindersPage />} />
                <Route path="/club" element={<ClubPage />} />
                {/* Redirect unknown routes to schedule */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </AppShell>
    );
}
