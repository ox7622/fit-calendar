import { useState } from 'react';

import { type IAdminScheduleItem, type IScheduleFormPayload } from '@/shared/api';
import { DatePicker } from '@/shared/components/DatePicker';
import { Modal } from '@/shared/components/Modal';
import { format, startOfWeek } from 'date-fns';
import { ru } from 'date-fns/locale';

import { buildWeekCopy } from './build-week-copy';
import { BulkPreview } from './BulkPreview';
import { useBulkCreate } from './use-bulk-create';

interface ICopyWeekDialogProps {
    items: IAdminScheduleItem[]; // the source week's items (already loaded in the page)
    sourceWeekStart: Date;
    onClose: () => void;
    onCreated: (count: number) => void;
}

export function CopyWeekDialog({ items, sourceWeekStart, onClose, onCreated }: ICopyWeekDialogProps) {
    const [targetDate, setTargetDate] = useState<string>(() => format(sourceWeekStart, 'yyyy-MM-dd'));
    const { submitting, error, confirm } = useBulkCreate(onCreated, onClose, 'Не удалось скопировать неделю');

    const targetWeekStart = startOfWeek(new Date(`${targetDate}T00:00:00`), { weekStartsOn: 1 });
    const entries: IScheduleFormPayload[] = buildWeekCopy(items, sourceWeekStart, targetWeekStart);

    return (
        <Modal title="Копировать неделю" onClose={onClose}>
            <p className="text-body-secondary mb-4 text-sm">
                Копируется {items.filter((i) => i.status === 'scheduled').length} активных занятий недели{' '}
                {format(sourceWeekStart, 'd MMM', { locale: ru })}.
            </p>
            <label className="text-body mb-1 block">Целевая неделя (любой день в ней)</label>
            <DatePicker value={targetDate} onChange={setTargetDate} />
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
