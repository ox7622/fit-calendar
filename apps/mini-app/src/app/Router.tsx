import { Routes, Route, Navigate } from 'react-router-dom';
import { ClassDetailPage, SchedulePage, CoachesPage, RemindersPage, ClubPage, PlansPage } from '@/pages';
import { AppShell } from './components';

/**
 * App Router with all route definitions
 */
export function AppRouter(): JSX.Element {
    return (
        <Routes>
            <Route
                path="/"
                element={
                    <AppShell>
                        <SchedulePage />
                    </AppShell>
                }
            />
            <Route
                path="/coaches"
                element={
                    <AppShell>
                        <CoachesPage />
                    </AppShell>
                }
            />
            <Route
                path="/reminders"
                element={
                    <AppShell>
                        <RemindersPage />
                    </AppShell>
                }
            />
            <Route
                path="/club"
                element={
                    <AppShell>
                        <ClubPage />
                    </AppShell>
                }
            />
            <Route
                path="/plans"
                element={
                    <AppShell>
                        <PlansPage />
                    </AppShell>
                }
            />
            {/* Class detail page - no bottom nav */}
            <Route path="/schedule/:id" element={<ClassDetailPage />} />
            {/* Redirect unknown routes to schedule */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}
