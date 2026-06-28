import { useState } from 'react';

import { type IAdminScheduleItem, type IScheduleFormPayload } from '@/shared/api';
import { DatePicker } from '@/shared/components/DatePicker';
import { useClubTimeZone } from '@/shared/club-timezone';
import { Modal } from '@/shared/components/Modal';
import { formatInClubTz } from '@fitcalendar/shared';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

import { buildDuplicate } from './build-duplicate';
import { BulkPreview } from './BulkPreview';
import { useBulkCreate } from './use-bulk-create';

interface IDuplicateClassDialogProps {
    source: IAdminScheduleItem;
    onClose: () => void;
    onCreated: (count: number) => void;
}

export function DuplicateClassDialog({ source, onClose, onCreated }: IDuplicateClassDialogProps) {
    const tz = useClubTimeZone();
    const [dates, setDates] = useState<string[]>([]);
    const [draft, setDraft] = useState<string>('');
    const { submitting, error, confirm } = useBulkCreate(onCreated, onClose, 'Не удалось скопировать занятие');

    const addDate = (): void => {
        if (draft && !dates.includes(draft)) setDates((prev) => [...prev, draft]);
        setDraft('');
    };
    const removeDate = (d: string): void => setDates((prev) => prev.filter((x) => x !== d));

    const entries: IScheduleFormPayload[] = buildDuplicate(
        source,
        dates.map((d) => new Date(`${d}T00:00:00`)),
    );

    return (
        <Modal title="Копировать занятие" onClose={onClose}>
            <p className="text-body-secondary mb-4 text-sm">
                {source.trainingType.name} · {source.coach.name} · {formatInClubTz(source.startTime, tz, 'HH:mm')} (
                {source.durationMinutes} мин)
            </p>
            <label className="text-body mb-1 block">Добавить дату</label>
            <div className="flex gap-2 mb-2">
                <div className="flex-1">
                    <DatePicker value={draft} onChange={setDraft} />
                </div>
                <button
                    type="button"
                    onClick={addDate}
                    className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"
                >
                    Добавить
                </button>
            </div>
            <div className="flex flex-wrap gap-1 mb-1">
                {dates.map((d) => (
                    <button
                        key={d}
                        type="button"
                        onClick={() => removeDate(d)}
                        className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs hover:bg-error/10 hover:text-error"
                    >
                        {format(new Date(`${d}T00:00:00`), 'd MMM', { locale: ru })} ✕
                    </button>
                ))}
            </div>
            <BulkPreview
                entries={entries}
                submitting={submitting}
                error={error}
                onConfirm={() => confirm(entries)}
                onCancel={onClose}
            />
        </Modal>
    );
}
