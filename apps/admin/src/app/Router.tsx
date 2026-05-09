import { DashboardPage, LoginPage, PlanEditPage, PlanNewPage, PlansListPage } from '@/pages';
import { Navigate, Route, Routes } from 'react-router-dom';

import { AdminShell } from './components/AdminShell';
import { RequireAuth } from './components/RequireAuth';

export function AppRouter() {
    return (
        <Routes>
            <Route path="/login" element={<LoginPage />} />

            {/* Protected routes — RequireAuth gates them, AdminShell wraps with the top bar. */}
            <Route element={<RequireAuth />}>
                <Route element={<AdminShell />}>
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/plans" element={<PlansListPage />} />
                    <Route path="/plans/new" element={<PlanNewPage />} />
                    <Route path="/plans/:id" element={<PlanEditPage />} />
                </Route>
            </Route>

            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
    );
}

export default AppRouter;
