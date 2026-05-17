import { useEffect, useState } from 'react';

import { ImportDialog } from '@/features/customers/ImportDialog';
import { adminCustomersApi, type IAdminCustomer, type ICustomerListQuery } from '@/shared/api';
import { Link } from 'react-router-dom';

const PAGE_SIZE = 50;

type TStatusFilter = 'all' | 'active' | 'inactive';
type TLinkageFilter = 'all' | 'linked' | 'unlinked';

function statusToQuery(filter: TStatusFilter): boolean | undefined {
    if (filter === 'active') return true;
    if (filter === 'inactive') return false;
    return undefined;
}

export function CustomersListPage() {
    const [items, setItems] = useState<IAdminCustomer[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [statusFilter, setTStatusFilter] = useState<TStatusFilter>('all');
    const [linkageFilter, setTLinkageFilter] = useState<TLinkageFilter>('all');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showImport, setShowImport] = useState(false);
    const [refreshNonce, setRefreshNonce] = useState(0);

    // Debounce the search input — single network request per ~300ms of typing.
    useEffect(() => {
        const handle = window.setTimeout(() => setDebouncedSearch(search), 300);
        return () => window.clearTimeout(handle);
    }, [search]);

    useEffect(() => {
        let cancelled = false;
        const query: ICustomerListQuery = {
            search: debouncedSearch || undefined,
            isActive: statusToQuery(statusFilter),
            linkedOnly: linkageFilter === 'linked' ? true : undefined,
            page,
            pageSize: PAGE_SIZE,
        };
        setLoading(true);
        adminCustomersApi
            .list(query)
            .then((response) => {
                if (cancelled) return;
                // Apply the unlinked filter client-side since the API only supports linkedOnly.
                const filtered =
                    linkageFilter === 'unlinked' ? response.items.filter((c) => c.telegramId === null) : response.items;
                setItems(filtered);
                setTotal(response.total);
                setLoading(false);
            })
            .catch(() => {
                if (cancelled) return;
                setError('Не удалось загрузить клиентов');
                setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [debouncedSearch, statusFilter, linkageFilter, page, refreshNonce]);

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    return (
        <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="heading-2">Клиенты</h2>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setShowImport(true)}
                        className="rounded-md border border-border px-4 py-2 hover:bg-muted"
                    >
                        Импорт CSV
                    </button>
                    <Link
                        to="/customers/new"
                        className="rounded-md bg-primary text-primary-foreground px-4 py-2 font-medium hover:bg-accent-active"
                    >
                        Добавить клиента
                    </Link>
                </div>
            </div>

            {showImport && (
                <ImportDialog onClose={() => setShowImport(false)} onSuccess={() => setRefreshNonce((n) => n + 1)} />
            )}

            <div className="flex flex-wrap gap-3 items-center">
                <input
                    type="search"
                    placeholder="Поиск по имени, телефону, Telegram..."
                    value={search}
                    onChange={(e) => {
                        setPage(1);
                        setSearch(e.target.value);
                    }}
                    className="flex-1 min-w-[240px] rounded-md border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <select
                    value={statusFilter}
                    onChange={(e) => {
                        setPage(1);
                        setTStatusFilter(e.target.value as TStatusFilter);
                    }}
                    className="rounded-md border border-input bg-background px-3 py-2"
                >
                    <option value="all">Все статусы</option>
                    <option value="active">Активные</option>
                    <option value="inactive">Неактивные</option>
                </select>
                <select
                    value={linkageFilter}
                    onChange={(e) => {
                        setPage(1);
                        setTLinkageFilter(e.target.value as TLinkageFilter);
                    }}
                    className="rounded-md border border-input bg-background px-3 py-2"
                >
                    <option value="all">Все привязки</option>
                    <option value="linked">С Telegram</option>
                    <option value="unlinked">Без Telegram</option>
                </select>
            </div>

            {loading ? (
                <p className="text-body-secondary">Загрузка...</p>
            ) : error ? (
                <p className="text-destructive">{error}</p>
            ) : items.length === 0 ? (
                <p className="text-body-secondary">Клиентов нет.</p>
            ) : (
                <>
                    <div className="overflow-x-auto rounded-lg border border-border">
                        <table className="w-full text-sm">
                            <thead className="bg-muted text-left">
                                <tr>
                                    <th className="px-4 py-2">Имя</th>
                                    <th className="px-4 py-2">Телефон</th>
                                    <th className="px-4 py-2">Статус</th>
                                    <th className="px-4 py-2">Telegram</th>
                                    <th className="px-4 py-2"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {items.map((customer) => (
                                    <tr key={customer.id}>
                                        <td className="px-4 py-2 font-medium">
                                            {customer.firstName} {customer.lastName ?? ''}
                                        </td>
                                        <td className="px-4 py-2">
                                            <code className="text-foreground">{customer.phone}</code>
                                        </td>
                                        <td className="px-4 py-2">
                                            {customer.isActive ? (
                                                <span className="text-primary">Активный</span>
                                            ) : (
                                                <span className="text-muted-foreground">Неактивный</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-2">
                                            {customer.telegramId ? (
                                                <span className="text-primary" aria-label="Telegram linked">
                                                    ✓ {customer.telegramUsername ? `@${customer.telegramUsername}` : ''}
                                                </span>
                                            ) : (
                                                <span className="text-muted-foreground">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-2 text-right">
                                            <Link
                                                to={`/customers/${customer.id}`}
                                                className="text-primary hover:underline"
                                            >
                                                Изменить
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {totalPages > 1 && (
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">
                                Стр. {page} из {totalPages} ({total} всего)
                            </span>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="rounded-md border border-border px-3 py-1.5 disabled:opacity-50"
                                >
                                    Назад
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="rounded-md border border-border px-3 py-1.5 disabled:opacity-50"
                                >
                                    Вперёд
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

export default CustomersListPage;
