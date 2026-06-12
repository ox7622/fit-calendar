import { useState } from 'react';

import { adminScheduleApi, type IScheduleFormPayload } from '@/shared/api';

interface IUseBulkCreate {
    submitting: boolean;
    error: string | null;
    confirm: (entries: IScheduleFormPayload[]) => Promise<void>;
}

/**
 * Shared submit logic for the bulk-create dialogs: POST the entries, report the
 * created count, close on success, surface the error otherwise.
 */
export function useBulkCreate(
    onCreated: (count: number) => void,
    onClose: () => void,
    errorMessage: string,
): IUseBulkCreate {
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const confirm = async (entries: IScheduleFormPayload[]): Promise<void> => {
        setSubmitting(true);
        setError(null);
        try {
            const res = await adminScheduleApi.bulkCreate(entries);
            onCreated(res.created);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : errorMessage);
            setSubmitting(false);
        }
    };

    return { submitting, error, confirm };
}
