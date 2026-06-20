import { confirmNotify } from '@/features/schedule/notify-window';
import { ScheduleForm } from '@/features/schedule/ScheduleForm';
import { adminScheduleApi, extractApiMessage } from '@/shared/api';
import { useConfirm } from '@/shared/components/ConfirmDialog';
import { Modal } from '@/shared/components/Modal';

interface ICreateClassDialogProps {
    /** The day column the admin clicked "+" on. Prefills the form's date. */
    day: Date;
    onClose: () => void;
    /** Called after a successful create; `count` is 1 for single, N for recurring. */
    onCreated: (count: number) => void;
}

/** The form prefills its date from an ISO string; default the time to 09:00 local. */
function dayAtNineISO(day: Date): string {
    const base = new Date(day);
    base.setHours(9, 0, 0, 0);
    return base.toISOString();
}

export function CreateClassDialog({ day, onClose, onCreated }: ICreateClassDialogProps): JSX.Element {
    const { confirm, dialog } = useConfirm();
    return (
        <Modal title="Новое занятие" onClose={onClose} panelClassName="max-h-[90vh] overflow-y-auto">
            <ScheduleForm
                initial={{ startTime: dayAtNineISO(day) }}
                submitLabel="Создать"
                onSubmit={async (payload) => {
                    const { proceed, notify } = await confirmNotify(confirm, payload.startTime, {
                        title: 'Создать занятие?',
                        confirmLabel: 'Создать',
                    });
                    if (!proceed) return;
                    try {
                        await adminScheduleApi.create(payload, notify);
                        onCreated(1);
                        onClose();
                    } catch (err) {
                        throw new Error(extractApiMessage(err, 'Не удалось создать занятие'));
                    }
                }}
                onSubmitRecurring={async (entries) => {
                    try {
                        await adminScheduleApi.bulkCreate(entries);
                        onCreated(entries.length);
                        onClose();
                    } catch (err) {
                        throw new Error(extractApiMessage(err, 'Не удалось создать занятия'));
                    }
                }}
                onCancel={onClose}
            />
            {dialog}
        </Modal>
    );
}
