import type { IScheduleFormPayload } from '@/shared/api';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';

interface IBulkPreviewProps {
    entries: IScheduleFormPayload[];
    submitting: boolean;
    error: string | null;
    onConfirm: () => void;
    onCancel: () => void;
}

export function BulkPreview({ entries, submitting, error, onConfirm, onCancel }: IBulkPreviewProps) {
    const count = entries.length;
    return (
        <div className="mt-4 space-y-3">
            <div className="rounded-md border border-border bg-surface p-2 max-h-40 overflow-y-auto text-xs text-body-secondary">
                {count === 0 ? (
                    <p className="text-center py-2">Нет занятий для создания</p>
                ) : (
                    entries.slice(0, 50).map((e, i) => (
                        <div key={`${e.startTime}-${i}`} className="flex justify-between py-0.5">
                            <span>{format(parseISO(e.startTime), 'EEE, d MMM HH:mm', { locale: ru })}</span>
                        </div>
                    ))
                )}
                {count > 50 && <p className="text-center pt-1">…и ещё {count - 50}</p>}
            </div>
            {error && <p className="text-error text-sm">{error}</p>}
            <div className="flex items-center justify-between">
                <span className="text-body-secondary text-sm">Будет создано: {count}</span>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"
                    >
                        Отмена
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={count === 0 || submitting}
                        className="rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-sm font-medium hover:bg-accent-active disabled:opacity-50"
                    >
                        {submitting ? 'Создаю…' : 'Создать'}
                    </button>
                </div>
            </div>
        </div>
    );
}
