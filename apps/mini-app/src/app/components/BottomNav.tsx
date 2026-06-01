import { motion } from 'framer-motion';
import { Calendar, Home, User, Users } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';

export type TabId = 'schedule' | 'coaches' | 'me' | 'club';

interface Tab {
    id: TabId;
    path: string;
    icon: typeof Calendar;
    label: string;
}

const tabs: Tab[] = [
    { id: 'schedule', path: '/', icon: Calendar, label: 'Расписание' },
    { id: 'coaches', path: '/coaches', icon: Users, label: 'Тренеры' },
    { id: 'me', path: '/me', icon: User, label: 'Профиль' },
    { id: 'club', path: '/club', icon: Home, label: 'Клуб' },
];

function cn(...classes: (string | boolean | undefined)[]): string {
    return classes.filter(Boolean).join(' ');
}

export function BottomNav(): JSX.Element {
    const location = useLocation();

    const getActiveTab = (): TabId => {
        const path = location.pathname;
        // Reminders now live inside the profile section — keep the Профиль tab lit.
        if (path.startsWith('/me') || path.startsWith('/reminders')) return 'me';
        const tab = tabs.find((t) => t.path === path);
        return tab?.id ?? 'schedule';
    };

    const activeTab = getActiveTab();

    return (
        <nav className="border-t border-border bg-background">
            <div className="flex">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;

                    return (
                        <NavLink
                            key={tab.id}
                            to={tab.path}
                            className="flex-1 flex flex-col items-center py-2 px-1 relative"
                        >
                            <motion.div
                                animate={{
                                    scale: isActive ? 1.1 : 1,
                                }}
                                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                            >
                                <Icon
                                    size={22}
                                    className={cn(
                                        'transition-colors',
                                        isActive ? 'text-primary' : 'text-muted-foreground',
                                    )}
                                />
                            </motion.div>
                            <span
                                className={cn(
                                    'text-[10px] mt-1 transition-colors',
                                    isActive ? 'text-primary font-medium' : 'text-muted-foreground',
                                )}
                            >
                                {tab.label}
                            </span>
                        </NavLink>
                    );
                })}
            </div>
        </nav>
    );
}
