import { useEffect, useState } from 'react';

import { CopyWeekDialog } from '@/features/schedule/bulk/CopyWeekDialog';
import { CreateClassDialog } from '@/features/schedule/CreateClassDialog';
import { MoveClassConfirm } from '@/features/schedule/MoveClassConfirm';
import { ScheduleCalendar } from '@/features/schedule/ScheduleCalendar';
import { ScheduleFilters } from '@/features/schedule/ScheduleFilters';
import { ScheduleList } from '@/features/schedule/ScheduleList';
import {
    adminScheduleApi,
    type IAdminScheduleItem,
    type IAdminScheduleQuery,
    type TAdminScheduleStatusFilter,
} from '@/shared/api';
import { addDays, addWeeks, format, startOfWeek, subWeeks } from 'date-fns';
import { ru } from 'date-fns/locale';
import { CalendarDays, ChevronLeft, ChevronRight, List as ListIcon, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

const DEFAULT_RANGE_DAYS = 7;
type TView = 'list' | 'calendar';

function formatRangeLabel(from: Date, to: Date): string {
    const fromLabel = format(from, 'd MMMM', { locale: ru });
    const toLabel = format(to, 'd MMMM', { locale: ru });
    return `${fromLabel} – ${toLabel}`;
}

export function DashboardPage() {
    const [view, setView] = useState<TView>('list');
    const [rangeStart, setRangeStart] = useState<Date>(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
    const [status, setStatus] = useState<TAdminScheduleStatusFilter>('all');
    const [items, setItems] = useState<IAdminScheduleItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [reloadToken, setReloadToken] = useState(0);
    const [copyWeekOpen, setCopyWeekOpen] = useState(false);
    const [toast, setToast] = useState<string | null>(null);
    const [selectMode, setSelectMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [bulkBusy, setBulkBusy] = useState(false);
    const [createDay, setCreateDay] = useState<Date | null>(null);
    const [pendingMove, setPendingMove] = useState<{ item: IAdminScheduleItem; newStartTime: string } | null>(null);

    const rangeEnd = addDays(rangeStart, DEFAULT_RANGE_DAYS - 1);

    useEffect(() => {
        let cancelled = false;
        const query: IAdminScheduleQuery = {
            from: rangeStart.toISOString(),
            // `to` covers the full last day of the window (rangeStart + DEFAULT_RANGE_DAYS).
            // Derived from rangeStart so we don't need `rangeEnd` in the dep array.
            to: addDays(rangeStart, DEFAULT_RANGE_DAYS).toISOString(),
            status,
            pageSize: 200,
        };
        setLoading(true);
        adminScheduleApi
            .list(query)
            .then((response) => {
                if (cancelled) return;
                setItems(response.items);
                setError(null);
                setLoading(false);
            })
            .catch(() => {
                if (cancelled) return;
                setError('Не удалось загрузить расписание');
                setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [rangeStart, status, reloadToken]);

    const showToast = (message: string): void => {
        setToast(message);
        setTimeout(() => setToast(null), 4000);
    };

    const onCreated = (count: number): void => {
        setReloadToken((t) => t + 1);
        showToast(`Создано занятий: ${count}`);
    };

    const onMoved = (): void => {
        setReloadToken((t) => t + 1);
        showToast('Занятие перенесено');
    };

    const onPrev = (): void => setRangeStart((prev) => subWeeks(prev, 1));
    const onNext = (): void => setRangeStart((prev) => addWeeks(prev, 1));
    const onToday = (): void => setRangeStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

    const exitSelectMode = (): void => {
        setSelectMode(false);
        setSelectedIds(new Set());
    };

    const toggleSelect = (id: string): void => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const handleBulkDelete = async (): Promise<void> => {
        const ids = [...selectedIds];
        if (ids.length === 0) return;
        if (
            !window.confirm(
                `Удалить выбранные занятия (${ids.length})? ` +
                    'Занятия, на которые записаны клиенты, будут пропущены — их нужно отменять.',
            )
        ) {
            return;
        }
        setBulkBusy(true);
        try {
            const res = await adminScheduleApi.bulkDelete(ids);
            const subs = res.skipped.filter((s) => s.reason === 'has_subscribers').length;
            const gone = res.skipped.filter((s) => s.reason === 'not_found').length;
            const parts = [`Удалено: ${res.deleted.length}`];
            if (subs > 0) parts.push(`пропущено (есть записи): ${subs}`);
            if (gone > 0) parts.push(`не найдено: ${gone}`);
            showToast(parts.join(', '));
            exitSelectMode();
            setReloadToken((t) => t + 1);
        } catch {
            showToast('Не удалось удалить занятия');
        } finally {
            setBulkBusy(false);
        }
    };

    return (
        <div className="p-6 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <h2 className="heading-2">Расписание</h2>
                <div className="flex items-center gap-2">
                    <Link
                        to="/schedule/new"
                        className="inline-flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-sm font-medium hover:bg-accent-active"
                    >
                        <Plus size={16} />
                        Добавить занятие
                    </Link>
                    <button
                        type="button"
                        onClick={() => setCopyWeekOpen(true)}
                        disabled={items.length === 0}
                        className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
                    >
                        Копировать неделю
                    </button>
                    {view === 'calendar' && (
                        <button
                            type="button"
                            onClick={() => (selectMode ? exitSelectMode() : setSelectMode(true))}
                            disabled={items.length === 0}
                            className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors disabled:opacity-50 ${
                                selectMode
                                    ? 'border-primary bg-primary/10 text-primary font-medium'
                                    : 'border-border hover:bg-muted'
                            }`}
                        >
                            {selectMode ? 'Готово' : 'Выбрать'}
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => {
                            exitSelectMode();
                            setView('list');
                        }}
                        className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors ${
                            view === 'list'
                                ? 'bg-primary/10 text-primary font-medium'
                                : 'text-body-secondary hover:bg-muted'
                        }`}
                    >
                        <ListIcon size={16} />
                        Список
                    </button>
                    <button
                        type="button"
                        onClick={() => setView('calendar')}
                        className={`hidden lg:inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors ${
                            view === 'calendar'
                                ? 'bg-primary/10 text-primary font-medium'
                                : 'text-body-secondary hover:bg-muted'
                        }`}
                    >
                        <CalendarDays size={16} />
                        Календарь
                    </button>
                </div>
            </div>

            {selectMode && view === 'calendar' && (
                <div className="flex items-center justify-between gap-3 rounded-md border border-primary/40 bg-primary/5 px-3 py-2">
                    <span className="text-sm">Выбрано занятий: {selectedIds.size}</span>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={exitSelectMode}
                            disabled={bulkBusy}
                            className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
                        >
                            Отмена
                        </button>
                        <button
                            type="button"
                            onClick={handleBulkDelete}
                            disabled={bulkBusy || selectedIds.size === 0}
                            className="rounded-md bg-destructive px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                        >
                            {bulkBusy ? 'Удаление...' : `Удалить (${selectedIds.size})`}
                        </button>
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={onPrev}
                        className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"
                        aria-label="Предыдущая неделя"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <span className="text-sm font-medium min-w-[180px] text-center">
                        {formatRangeLabel(rangeStart, rangeEnd)}
                    </span>
                    <button
                        type="button"
                        onClick={onNext}
                        className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"
                        aria-label="Следующая неделя"
                    >
                        <ChevronRight size={18} />
                    </button>
                    <button
                        type="button"
                        onClick={onToday}
                        className="ml-2 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"
                    >
                        Сегодня
                    </button>
                </div>
                <ScheduleFilters status={status} onStatusChange={setStatus} />
            </div>

            {loading ? (
                <p className="text-body-secondary text-center py-8">Загрузка...</p>
            ) : error ? (
                <p className="text-destructive text-center py-8">{error}</p>
            ) : view === 'calendar' ? (
                <ScheduleCalendar
                    items={items}
                    rangeStart={rangeStart}
                    selectMode={selectMode}
                    selectedIds={selectedIds}
                    onToggleSelect={toggleSelect}
                    onRequestMove={(item, newStartTime) => setPendingMove({ item, newStartTime })}
                    onCreateForDay={(day) => setCreateDay(day)}
                />
            ) : (
                <ScheduleList items={items} />
            )}

            {copyWeekOpen && (
                <CopyWeekDialog
                    items={items}
                    sourceWeekStart={rangeStart}
                    onClose={() => setCopyWeekOpen(false)}
                    onCreated={onCreated}
                />
            )}
            {createDay && (
                <CreateClassDialog day={createDay} onClose={() => setCreateDay(null)} onCreated={onCreated} />
            )}
            {pendingMove && (
                <MoveClassConfirm
                    item={pendingMove.item}
                    newStartTime={pendingMove.newStartTime}
                    onMoved={onMoved}
                    onClose={() => setPendingMove(null)}
                />
            )}
            {toast && (
                <div className="fixed bottom-4 right-4 z-50 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm shadow-lg">
                    {toast}
                </div>
            )}
        </div>
    );
}

export default DashboardPage;
