import { useState } from 'react';

import { useAdminStore } from '@/shared/stores/adminStore';
import { LogOut, Menu, Moon, Sun, X, Zap } from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';

import { useTheme } from '../providers/ThemeProvider';

function ThemeToggle(): JSX.Element {
    const { theme, toggleTheme } = useTheme();
    return (
        <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'light' ? 'Тёмная тема' : 'Светлая тема'}
            title={theme === 'light' ? 'Тёмная тема' : 'Светлая тема'}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border hover:bg-muted"
        >
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
        </button>
    );
}

const NAV_ITEMS: Array<{ to: string; label: string }> = [
    { to: '/dashboard', label: 'Расписание' },
    { to: '/customers', label: 'Клиенты' },
    { to: '/plans', label: 'Абонементы' },
    { to: '/coaches', label: 'Тренеры' },
    { to: '/training-types', label: 'Типы' },
    { to: '/taxonomy', label: 'Настройки занятий' },
    { to: '/club', label: 'Клуб' },
    { to: '/admins', label: 'Админы' },
];

export function AdminShell() {
    const navigate = useNavigate();
    const admin = useAdminStore((s) => s.admin);
    const clearAuth = useAdminStore((s) => s.clearAuth);
    const [menuOpen, setMenuOpen] = useState(false);

    const onLogout = () => {
        setMenuOpen(false);
        clearAuth();
        // Defensive: store should already clear localStorage, but the spec calls
        // for an explicit removal so a partial-state store doesn't leave a stale token.
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
        navigate('/login', { replace: true });
    };

    const navLinkClass = ({ isActive }: { isActive: boolean }): string =>
        `rounded-lg px-3 py-1.5 text-sm transition-colors ${
            isActive ? 'bg-primary/15 text-primary font-medium' : 'text-body-secondary hover:bg-muted'
        }`;

    return (
        <div className="flex min-h-screen min-w-[768px] flex-col bg-background text-foreground">
            <header className="border-b border-border bg-card">
                <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-6">
                        {/* Brand → dashboard. `flex-shrink-0` + `whitespace-nowrap` keep the
                            logo on one line so the nav can't squeeze it into two rows on wide screens. */}
                        <NavLink to="/dashboard" className="flex flex-shrink-0 items-center gap-2">
                            <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                                <Zap size={18} />
                            </span>
                            <h1 className="heading-3 whitespace-nowrap">Админ-панель</h1>
                        </NavLink>
                        {/* Desktop nav — collapses into the burger below `lg`. */}
                        <nav className="hidden lg:flex items-center gap-1">
                            {NAV_ITEMS.map((item) => (
                                <NavLink key={item.to} to={item.to} className={navLinkClass}>
                                    {item.label}
                                </NavLink>
                            ))}
                        </nav>
                    </div>

                    {/* Desktop right block. */}
                    <div className="hidden lg:flex items-center gap-3">
                        <ThemeToggle />
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

                    {/* Theme toggle + burger — shown below `lg`. */}
                    <div className="lg:hidden flex items-center gap-2">
                        <ThemeToggle />
                        <button
                            type="button"
                            onClick={() => setMenuOpen((open) => !open)}
                            aria-label={menuOpen ? 'Закрыть меню' : 'Открыть меню'}
                            aria-expanded={menuOpen}
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border hover:bg-muted"
                        >
                            {menuOpen ? <X size={18} /> : <Menu size={18} />}
                        </button>
                    </div>
                </div>

                {/* Mobile dropdown panel. */}
                {menuOpen && (
                    <div className="lg:hidden border-t border-border px-4 py-3">
                        <nav className="flex flex-col gap-1">
                            {NAV_ITEMS.map((item) => (
                                <NavLink
                                    key={item.to}
                                    to={item.to}
                                    onClick={() => setMenuOpen(false)}
                                    className={navLinkClass}
                                >
                                    {item.label}
                                </NavLink>
                            ))}
                        </nav>
                        <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
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
                    </div>
                )}
            </header>
            <main className="flex-1">
                <Outlet />
            </main>
        </div>
    );
}

export default AdminShell;
