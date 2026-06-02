# 10. Frontend Architecture

## 10.1 Mini App Structure

```
apps/mini-app/
├── src/
│   ├── app/
│   │   ├── App.tsx
│   │   ├── Router.tsx
│   │   └── providers/
│   │       ├── ThemeProvider.tsx
│   │       └── QueryProvider.tsx
│   ├── pages/
│   │   ├── SchedulePage.tsx
│   │   ├── CoachesPage.tsx
│   │   ├── CoachProfilePage.tsx
│   │   ├── RemindersPage.tsx
│   │   └── ClubPage.tsx
│   ├── features/
│   │   ├── schedule/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   └── api/
│   │   ├── coaches/
│   │   ├── reminders/
│   │   └── club/
│   ├── shared/
│   │   ├── api/
│   │   │   └── client.ts
│   │   ├── hooks/
│   │   └── utils/
│   └── main.tsx
├── index.html
└── vite.config.ts
```

## 10.2 State Management (Zustand)

```typescript
// stores/userStore.ts
interface UserState {
    user: User | null;
    reminderMinutes: number;
    setUser: (user: User) => void;
    setReminderMinutes: (minutes: number) => void;
}

export const useUserStore = create<UserState>((set) => ({
    user: null,
    reminderMinutes: 30,
    setUser: (user) => set({ user }),
    setReminderMinutes: (minutes) => set({ reminderMinutes: minutes }),
}));

// stores/filterStore.ts
interface FilterState {
    difficulty: Difficulty | null;
    impactType: ImpactType | null;
    coachId: string | null;
    setFilters: (filters: Partial<FilterState>) => void;
    clearFilters: () => void;
}
```

## 10.3 API Client

```typescript
// shared/api/client.ts
import WebApp from '@twa-dev/sdk';

const API_BASE = import.meta.env.VITE_API_URL;

export const apiClient = {
    async get<T>(path: string): Promise<T> {
        const res = await fetch(`${API_BASE}${path}`, {
            headers: {
                'X-Telegram-Init-Data': WebApp.initData,
            },
        });
        if (!res.ok) throw new ApiError(res);
        return res.json();
    },

    async post<T>(path: string, data: unknown): Promise<T> {
        const res = await fetch(`${API_BASE}${path}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Telegram-Init-Data': WebApp.initData,
            },
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new ApiError(res);
        return res.json();
    },
};
```

## 10.4 Theme Integration

```typescript
// providers/ThemeProvider.tsx
import WebApp from '@twa-dev/sdk';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setTheme] = useState<'light' | 'dark'>(WebApp.colorScheme || 'light');

    useEffect(() => {
        // Listen for Telegram theme changes
        WebApp.onEvent('themeChanged', () => {
            setTheme(WebApp.colorScheme);
        });
    }, []);

    return <div className={`theme-${theme}`}>{children}</div>;
}
```

---
