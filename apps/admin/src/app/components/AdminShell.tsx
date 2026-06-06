import { useAdminStore } from '@/shared/stores/adminStore';
import { LogOut, Zap } from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';

const NAV_ITEMS: Array<{ to: string; label: string }> = [
    { to: '/dashboard', label: 'Расписание' },
    { to: '/customers', label: 'Клиенты' },
    { to: '/plans', label: 'Абонементы' },
    { to: '/coaches', label: 'Тренеры' },
    { to: '/training-types', label: 'Типы' },
    { to: '/club', label: 'Клуб' },
    { to: '/admins', label: 'Админы' },
];

export function AdminShell() {
    const navigate = useNavigate();
    const admin = useAdminStore((s) => s.admin);
    const clearAuth = useAdminStore((s) => s.clearAuth);

    const onLogout = () => {
        clearAuth();
        // Defensive: store should already clear localStorage, but the spec calls
        // for an explicit removal so a partial-state store doesn't leave a stale token.
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
        navigate('/login', { replace: true });
    };

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col">
            <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                            <Zap size={18} />
                        </span>
                        <h1 className="heading-3">Админ-панель</h1>
                    </div>
                    <nav className="flex items-center gap-1">
                        {NAV_ITEMS.map((item) => (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                className={({ isActive }) =>
                                    `rounded-lg px-3 py-1.5 text-sm transition-colors ${
                                        isActive
                                            ? 'bg-primary/15 text-primary font-medium'
                                            : 'text-body-secondary hover:bg-muted'
                                    }`
                                }
                            >
                                {item.label}
                            </NavLink>
                        ))}
                    </nav>
                </div>
                <div className="flex items-center gap-3">
                    {admin && (
                        <span className="text-sm text-body-secondary">
                            {admin.name} <span className="text-muted-foreground/70">· Администратор</span>
                        </span>
                    )}
                    <button
                        type="button"
                        onClick={onLogout}
                        className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted"
                    >
                        <LogOut size={15} />
                        Выйти
                    </button>
                </div>
            </header>
            <main className="flex-1">
                <Outlet />
            </main>
        </div>
    );
}

export default AdminShell;
