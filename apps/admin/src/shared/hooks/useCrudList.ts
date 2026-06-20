import { useCallback, useEffect, useState } from 'react';

import { ApiError, type TTaxonomyMoveDirection } from '@/shared/api';

/** Minimal API shape `useCrudList` needs — list, reorder, isActive toggle, hard-delete.
 *  Each section's own DTOs satisfy this structurally (their `update` accepts a wider
 *  `Partial<...>` payload; calling with `{ isActive }` is a valid subtype). */
export interface ICrudListApi<T> {
    list: () => Promise<T[]>;
    move: (id: string, direction: TTaxonomyMoveDirection) => Promise<T[]>;
    update: (id: string, payload: { isActive: boolean }) => Promise<T>;
    remove: (id: string) => Promise<void>;
}

interface IUseCrudListOptions<T> {
    /** Returned text is the user-facing prompt; if `null`, deletion proceeds without confirmation. */
    confirmDelete?: (item: T) => string | null;
    /** Map a 409 from `remove` into a user-facing message (e.g. "in use"). Other errors fall to a generic message. */
    on409?: (item: T) => string;
}

interface IUseCrudListResult<T> {
    items: T[];
    loading: boolean;
    error: string | null;
    actionError: string | null;
    busy: boolean;
    setItems: (items: T[]) => void;
    setActionError: (message: string | null) => void;
    reload: () => void;
    /** Serialize an async action; clears actionError, sets busy, releases on settle. */
    guard: (fn: () => Promise<void>) => Promise<void>;
    handleMove: (id: string, direction: TTaxonomyMoveDirection) => Promise<void>;
    toggleActive: (item: T) => Promise<void>;
    handleDelete: (item: T) => Promise<void>;
}

/**
 * Shared state + action handlers for the ordered, toggleable, deletable lists
 * powering admin "settings" sections (taxonomies, duration options). Per-section
 * concerns — add form, inline edit, row JSX — stay in the section.
 */
export function useCrudList<T extends { id: string; isActive: boolean }>(
    api: ICrudListApi<T>,
    options: IUseCrudListOptions<T> = {},
): IUseCrudListResult<T> {
    const [items, setItems] = useState<T[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const reload = useCallback((): void => {
        setLoading(true);
        api.list()
            .then((data) => {
                setItems(data);
                setError(null);
            })
            .catch(() => setError('Не удалось загрузить список'))
            .finally(() => setLoading(false));
    }, [api]);

    useEffect(reload, [reload]);

    const guard = useCallback(
        async (fn: () => Promise<void>): Promise<void> => {
            if (busy) return;
            setActionError(null);
            setBusy(true);
            try {
                await fn();
            } finally {
                setBusy(false);
            }
        },
        [busy],
    );

    const handleMove = (id: string, direction: TTaxonomyMoveDirection): Promise<void> =>
        guard(async () => {
            try {
                setItems(await api.move(id, direction));
            } catch {
                setActionError('Не удалось изменить порядок');
            }
        });

    const toggleActive = (item: T): Promise<void> =>
        guard(async () => {
            try {
                await api.update(item.id, { isActive: !item.isActive });
                reload();
            } catch {
                setActionError('Не удалось изменить статус');
            }
        });

    const handleDelete = (item: T): Promise<void> =>
        guard(async () => {
            const prompt = options.confirmDelete?.(item);
            if (prompt !== null && prompt !== undefined && !window.confirm(prompt)) return;
            try {
                await api.remove(item.id);
                reload();
            } catch (err) {
                if (err instanceof ApiError && err.status === 409 && options.on409) {
                    setActionError(options.on409(item));
                } else {
                    setActionError('Не удалось удалить');
                }
            }
        });

    return {
        items,
        loading,
        error,
        actionError,
        busy,
        setItems,
        setActionError,
        reload,
        guard,
        handleMove,
        toggleActive,
        handleDelete,
    };
}
