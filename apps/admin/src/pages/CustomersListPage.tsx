import { Plus, Search, Upload } from 'lucide-react';
import { useEffect, useState } from 'react';

import { CustomerDetailPanel } from '@/features/customers/CustomerDetailPanel';
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

function getInitials(first: string, last?: string | null): string {
    return `${first[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase() || '—';
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
    const [selectedId, setSelectedId] = useState<string | null>(null);

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
                <h2 className="heading-2">
                    Клиенты <span className="text-muted-foreground/70 font-normal">· {total}</span>
                </h2>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setShowImport(true)}
                        className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 hover:bg-muted"
                    >
                        <Upload size={16} />
                        Импорт CSV
                    </button>
                    <Link
                        to="/customers/new"
                        className="flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-4 py-2 font-medium hover:bg-accent-active"
                    >
                        <Plus size={16} />
                        Клиент
                    </Link>
                </div>
            </div>

            {showImport && (
                <ImportDialog onClose={() => setShowImport(false)} onSuccess={() => setRefreshNonce((n) => n + 1)} />
            )}

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_minmax(340px,400px)]">
                <div className="min-w-0 space-y-4">
                    <div className="flex flex-wrap gap-3 items-center">
                        <div className="relative flex-1 min-w-[240px]">
                            <Search
                                size={16}
                                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                            />
                            <input
                                type="search"
                                placeholder="Поиск по имени, телефону, Telegram..."
                                value={search}
                                onChange={(e) => {
                                    setPage(1);
                                    setSearch(e.target.value);
                                }}
                                className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                        </div>
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
                                    <thead className="bg-muted text-left text-xs uppercase tracking-wide text-muted-foreground">
                                        <tr>
                                            <th className="px-4 py-2">Клиент</th>
                                            <th className="px-4 py-2 w-32">Статус</th>
                                            <th className="px-4 py-2 w-40">Telegram</th>
                                            <th className="px-4 py-2 w-12"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {items.map((customer) => (
                                            <tr
                                                key={customer.id}
                                                onClick={() => setSelectedId(customer.id)}
                                                className={`cursor-pointer transition-colors ${
                                                    selectedId === customer.id ? 'bg-primary/10' : 'hover:bg-muted/40'
                                                }`}
                                            >
                                                <td className="px-4 py-2.5">
                                                    <div className="flex items-center gap-3">
                                                        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary">
                                                            {getInitials(customer.firstName, customer.lastName)}
                                                        </span>
                                                        <span className="min-w-0">
                                                            <span className="block font-medium text-foreground truncate">
                                                                {customer.firstName} {customer.lastName ?? ''}
                                                            </span>
                                                            <span className="block font-mono text-xs text-muted-foreground">
                                                                {customer.phone}
                                                            </span>
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-2.5">
                                                    <span className="inline-flex items-center gap-1.5">
                                                        <span
                                                            className={`h-2 w-2 rounded-full ${
                                                                customer.isActive
                                                                    ? 'bg-success'
                                                                    : 'bg-muted-foreground/50'
                                                            }`}
                                                        />
                                                        <span
                                                            className={
                                                                customer.isActive
                                                                    ? 'text-foreground'
                                                                    : 'text-muted-foreground'
                                                            }
                                                        >
                                                            {customer.isActive ? 'Активен' : 'Неактивен'}
                                                        </span>
                                                    </span>
                                                </td>
                                                <td className="px-4 py-2.5">
                                                    {customer.telegramId ? (
                                                        <span className="inline-flex items-center gap-1.5 text-primary">
                                                            <span className="h-2 w-2 rounded-full bg-primary" />
                                                            {customer.telegramUsername
                                                                ? `@${customer.telegramUsername}`
                                                                : 'привязан'}
                                                        </span>
                                                    ) : (
                                                        <span className="text-muted-foreground">—</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-2.5 text-right">
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

                <aside className="hidden h-[calc(100vh-7.5rem)] overflow-hidden rounded-lg border border-border bg-card lg:sticky lg:top-4 lg:block">
                    {selectedId ? (
                        <CustomerDetailPanel customerId={selectedId} onChanged={() => setRefreshNonce((n) => n + 1)} />
                    ) : (
                        <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
                            Выберите клиента, чтобы увидеть детали
                        </div>
                    )}
                </aside>
            </div>
        </div>
    );
}

export default CustomersListPage;
