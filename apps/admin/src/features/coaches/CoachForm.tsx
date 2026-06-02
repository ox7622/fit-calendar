import { useState, type FormEvent } from 'react';

import { CoachPhotoUpload } from '@/features/coaches/CoachPhotoUpload';
import { ChipInput } from '@/shared/components/ChipInput';

export interface ICoachFormValues {
    name: string;
    bio: string;
    specializations: string[];
    certifications: string[];
    isActive: boolean;
}

interface ICoachFormProps {
    initial?: Partial<ICoachFormValues>;
    photoUrl?: string | null;
    onPhotoUpload?: (file: File) => Promise<{ photoUrl: string }>;
    submitLabel: string;
    onSubmit: (values: ICoachFormValues) => Promise<void>;
    onCancel: () => void;
}

const EMPTY_VALUES: ICoachFormValues = {
    name: '',
    bio: '',
    specializations: [],
    certifications: [],
    isActive: true,
};

export function CoachForm({ initial, photoUrl, onPhotoUpload, submitLabel, onSubmit, onCancel }: ICoachFormProps) {
    const [values, setValues] = useState<ICoachFormValues>({ ...EMPTY_VALUES, ...initial });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: FormEvent): Promise<void> => {
        e.preventDefault();
        setError(null);
        if (values.name.trim().length < 2) {
            setError('Имя обязательно (минимум 2 символа)');
            return;
        }
        setSubmitting(true);
        try {
            await onSubmit({
                ...values,
                name: values.name.trim(),
                bio: values.bio.trim(),
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Не удалось сохранить');
            setSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="grid max-w-2xl gap-6 md:grid-cols-[200px_1fr]">
            <div>
                {onPhotoUpload ? (
                    <CoachPhotoUpload currentUrl={photoUrl ?? null} onUpload={onPhotoUpload} disabled={submitting} />
                ) : (
                    <div className="text-sm text-body-secondary">Фото можно загрузить после создания тренера.</div>
                )}
            </div>

            <div className="space-y-4">
                <div>
                    <label htmlFor="coach-name" className="text-body mb-1 block">
                        Имя <span className="text-destructive">*</span>
                    </label>
                    <input
                        id="coach-name"
                        type="text"
                        value={values.name}
                        onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
                        disabled={submitting}
                        className="w-full rounded border border-border bg-surface p-2 text-body"
                        maxLength={255}
                        required
                    />
                </div>

                <div>
                    <label htmlFor="coach-bio" className="text-body mb-1 block">
                        Биография
                    </label>
                    <textarea
                        id="coach-bio"
                        value={values.bio}
                        onChange={(e) => setValues((v) => ({ ...v, bio: e.target.value }))}
                        disabled={submitting}
                        className="w-full rounded border border-border bg-surface p-2 text-body"
                        rows={4}
                        maxLength={2000}
                    />
                </div>

                <div>
                    <label className="text-body mb-1 block">Специализации</label>
                    <ChipInput
                        values={values.specializations}
                        onChange={(next) => setValues((v) => ({ ...v, specializations: next }))}
                        placeholder="Например: Йога, Пилатес"
                        disabled={submitting}
                    />
                </div>

                <div>
                    <label className="text-body mb-1 block">Сертификаты</label>
                    <ChipInput
                        values={values.certifications}
                        onChange={(next) => setValues((v) => ({ ...v, certifications: next }))}
                        placeholder="Например: ACE, NASM"
                        disabled={submitting}
                    />
                </div>

                <label className="inline-flex items-center gap-2" title="Неактивные тренеры скрыты от участников клуба">
                    <input
                        type="checkbox"
                        checked={values.isActive}
                        onChange={(e) => setValues((v) => ({ ...v, isActive: e.target.checked }))}
                        disabled={submitting}
                    />
                    <span className="text-body">Активен</span>
                </label>

                {error && <p className="text-destructive">{error}</p>}

                <div className="flex gap-2">
                    <button
                        type="submit"
                        disabled={submitting}
                        className="rounded bg-primary px-4 py-2 text-white hover:opacity-90 disabled:opacity-50"
                    >
                        {submitting ? 'Сохранение...' : submitLabel}
                    </button>
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={submitting}
                        className="rounded border border-border px-4 py-2 text-body hover:bg-surface-hover disabled:opacity-50"
                    >
                        Отмена
                    </button>
                </div>
            </div>
        </form>
    );
}

export default CoachForm;
