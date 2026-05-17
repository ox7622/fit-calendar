import { useState, type ChangeEvent } from 'react';

import { adminCustomersApi, ApiError, type IImportPreview, type IImportResult } from '@/shared/api';

interface IImportDialogProps {
    onClose: () => void;
    onSuccess: () => void;
}

type TStep = 'pick' | 'preview' | 'done';

export function ImportDialog({ onClose, onSuccess }: IImportDialogProps) {
    const [step, setStep] = useState<TStep>('pick');
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<IImportPreview | null>(null);
    const [result, setResult] = useState<IImportResult | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handlePick = async (e: ChangeEvent<HTMLInputElement>): Promise<void> => {
        const picked = e.target.files?.[0];
        e.target.value = '';
        if (!picked) return;
        setError(null);
        setBusy(true);
        try {
            const dryRun = await adminCustomersApi.importDryRun(picked);
            setFile(picked);
            setPreview(dryRun);
            setStep('preview');
        } catch (err) {
            setError(extractMessage(err, 'Не удалось разобрать CSV'));
        } finally {
            setBusy(false);
        }
    };

    const handleApply = async (): Promise<void> => {
        if (!file) return;
        setError(null);
        setBusy(true);
        try {
            const committed = await adminCustomersApi.importCommit(file);
            setResult(committed);
            setStep('done');
        } catch (err) {
            setError(extractMessage(err, 'Не удалось применить импорт'));
        } finally {
            setBusy(false);
        }
    };

    const handleFinish = (): void => {
        onSuccess();
        onClose();
    };

    const applicableRows = preview ? preview.rowsToCreate + preview.rowsToUpdate : 0;
    const hasErrors = (preview?.errors.length ?? 0) > 0;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="import-dialog-title"
        >
            <div className="w-full max-w-3xl rounded-lg bg-background p-6 shadow-lg">
                <div className="mb-4 flex items-center justify-between">
                    <h3 id="import-dialog-title" className="heading-3">
                        Импорт клиентов из CSV
                    </h3>
                    <a href="/sample-customers.csv" download className="text-sm text-primary hover:underline">
                        Скачать пример
                    </a>
                </div>

                {step === 'pick' && (
                    <div className="space-y-4">
                        <p className="text-body-secondary">
                            Колонки: <code>firstName</code>, <code>phone</code> (обязательные); <code>lastName</code>,{' '}
                            <code>email</code>, <code>telegramUsername</code>, <code>notes</code> (необязательные).
                        </p>
                        <input
                            type="file"
                            accept=".csv,text/csv,application/vnd.ms-excel"
                            onChange={handlePick}
                            disabled={busy}
                            className="block w-full text-body"
                        />
                        {busy && <p className="text-body-secondary">Анализ файла...</p>}
                        {error && <p className="text-destructive">{error}</p>}
                    </div>
                )}

                {step === 'preview' && preview && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-4 gap-3 text-center">
                            <SummaryCell label="Всего строк" value={preview.rowsTotal} />
                            <SummaryCell label="Будет создано" value={preview.rowsToCreate} tone="primary" />
                            <SummaryCell label="Будет обновлено" value={preview.rowsToUpdate} tone="primary" />
                            <SummaryCell label="Пропущено" value={preview.rowsToSkip} tone="muted" />
                        </div>

                        {hasErrors && (
                            <div>
                                <h4 className="mb-2 font-semibold text-destructive">
                                    Ошибки ({preview.errors.length})
                                </h4>
                                <div className="max-h-64 overflow-y-auto rounded border border-border">
                                    <table className="w-full text-sm">
                                        <thead className="sticky top-0 bg-muted/40 text-body-secondary">
                                            <tr>
                                                <th className="w-16 p-1 text-left">Строка</th>
                                                <th className="w-32 p-1 text-left">Колонка</th>
                                                <th className="p-1 text-left">Сообщение</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {preview.errors.map((err, i) => (
                                                <tr key={i} className="border-t border-border">
                                                    <td className="p-1">{err.row}</td>
                                                    <td className="p-1">{err.column ?? '—'}</td>
                                                    <td className="p-1">{err.message}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {error && <p className="text-destructive">{error}</p>}

                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={busy}
                                className="rounded border border-border px-4 py-2 text-body hover:bg-surface-hover disabled:opacity-50"
                            >
                                {applicableRows === 0 ? 'Закрыть' : 'Отменить'}
                            </button>
                            {applicableRows > 0 && (
                                <button
                                    type="button"
                                    onClick={handleApply}
                                    disabled={busy}
                                    className="rounded bg-primary px-4 py-2 text-white hover:opacity-90 disabled:opacity-50"
                                >
                                    {busy
                                        ? 'Применение...'
                                        : hasErrors
                                        ? 'Применить (только корректные строки)'
                                        : 'Применить'}
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {step === 'done' && result && (
                    <div className="space-y-4">
                        <p className="text-primary">
                            Готово: создано {result.created}, обновлено {result.updated}, пропущено {result.skipped}.
                        </p>
                        <div className="flex justify-end">
                            <button
                                type="button"
                                onClick={handleFinish}
                                className="rounded bg-primary px-4 py-2 text-white hover:opacity-90"
                            >
                                Закрыть
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function SummaryCell({
    label,
    value,
    tone = 'default',
}: {
    label: string;
    value: number;
    tone?: 'default' | 'primary' | 'muted';
}) {
    const valueClass = tone === 'primary' ? 'text-primary' : tone === 'muted' ? 'text-body-secondary' : 'text-body';
    return (
        <div className="rounded border border-border bg-surface p-3">
            <div className={`text-2xl font-semibold ${valueClass}`}>{value}</div>
            <div className="text-xs text-body-secondary">{label}</div>
        </div>
    );
}

function extractMessage(err: unknown, fallback: string): string {
    if (err instanceof ApiError) {
        const body = err.data as { message?: string } | null;
        return body?.message ?? fallback;
    }
    if (err instanceof Error) return err.message;
    return fallback;
}

export default ImportDialog;
