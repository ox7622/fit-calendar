import { Routes, Route, Navigate } from 'react-router-dom';
import {
    ClassDetailPage,
    CoachDetailPage,
    CoachSchedulePage,
    CoachesPage,
    ClubPage,
    MePage,
    PlansPage,
    RemindersPage,
    SchedulePage,
} from '@/pages';
import { ToastViewport } from '@/components';
import { AppShell, RequireLinkedCustomer } from './components';

/**
 * App Router with all route definitions
 */
export function AppRouter(): JSX.Element {
    return (
        <>
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
                            <RequireLinkedCustomer linkPrompt="Привяжите профиль, чтобы получать напоминания.">
                                <RemindersPage />
                            </RequireLinkedCustomer>
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
                <Route
                    path="/me"
                    element={
                        <AppShell>
                            <RequireLinkedCustomer linkPrompt="Введите номер, указанный при регистрации в клубе.">
                                <MePage />
                            </RequireLinkedCustomer>
                        </AppShell>
                    }
                />
                {/* Class detail page - no bottom nav */}
                <Route path="/schedule/:id" element={<ClassDetailPage />} />
                {/* Coach detail + schedule pages - no bottom nav (own back button) */}
                <Route path="/coaches/:id" element={<CoachDetailPage />} />
                <Route path="/coaches/:id/schedule" element={<CoachSchedulePage />} />
                {/* Redirect unknown routes to schedule */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <ToastViewport />
        </>
    );
}
