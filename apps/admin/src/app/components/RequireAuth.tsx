import { useAdminStore } from '@/shared/stores/adminStore';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

export function RequireAuth() {
    const token = useAdminStore((s) => s.token);
    const location = useLocation();

    if (!token) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return <Outlet />;
}

export default RequireAuth;
