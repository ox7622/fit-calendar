import { useEffect, useState, type FormEvent } from 'react';

import { ClubLogoUpload } from '@/features/club/ClubLogoUpload';
import { WorkingHoursEditor } from '@/features/club/WorkingHoursEditor';
import { adminClubApi, ApiError, type IAdminClubInfo, type TWorkingHours } from '@/shared/api';
import { DEFAULT_TIME_ZONE, RUSSIA_TIME_ZONES } from '@fitcalendar/shared';

interface IFormState {
    name: string;
    address: string;
    phone: string;
    workingHours: TWorkingHours;
    mapUrl: string;
    timezone: string;
}

export function ClubInfoPage() {
    const [club, setClub] = useState<IAdminClubInfo | null>(null);
    const [form, setForm] = useState<IFormState | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        let cancelled = false;
        adminClubApi
            .get()
            .then((data) => {
                if (cancelled) return;
                setClub(data);
                setForm({
                    name: data.name,
                    address: data.address,
                    phone: data.phone ?? '',
                    workingHours: data.workingHours,
                    mapUrl: data.mapUrl ?? '',
                    timezone: data.timezone ?? DEFAULT_TIME_ZONE,
                });
                setLoading(false);
            })
            .catch(() => {
                if (cancelled) return;
                setError('Не удалось загрузить данные клуба');
                setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const handleSubmit = async (e: FormEvent): Promise<void> => {
        e.preventDefault();
        if (!form) return;
        setError(null);
        setSuccess(false);

        setSubmitting(true);
        try {
            const updated = await adminClubApi.update({
                name: form.name.trim(),
                address: form.address.trim(),
                phone: form.phone.trim() || undefined,
                workingHours: form.workingHours,
                mapUrl: form.mapUrl.trim() || undefined,
                timezone: form.timezone,
            });
            setClub(updated);
            setSuccess(true);
        } catch (err) {
            if (err instanceof ApiError) {
                const body = err.data as { message?: string } | null;
                setError(body?.message ?? 'Не удалось сохранить');
            } else {
                setError('Не удалось сохранить');
            }
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <p className="p-6 text-body-secondary">Загрузка...</p>;
    if (error && !club) return <p className="p-6 text-destructive">{error}</p>;
    if (!form) return null;

    const trimmedMapUrl = form.mapUrl.trim();

    return (
        <div className="p-6">
            <h2 className="heading-2 mb-4">Информация о клубе</h2>

            <form onSubmit={handleSubmit} className="grid max-w-4xl gap-6 lg:grid-cols-[160px_1fr]">
                <div>
                    {club && (
                        <ClubLogoUpload
                            currentUrl={club.logoUrl}
                            onUpload={async (file) => {
                                const { logoUrl } = await adminClubApi.uploadLogo(file);
                                setClub((prev) => (prev ? { ...prev, logoUrl } : prev));
                                return { logoUrl };
                            }}
                            disabled={submitting}
                        />
                    )}
                </div>

                <div className="space-y-6">
                    <section className="space-y-3">
                        <h3 className="heading-3">Основные данные</h3>

                        <div>
                            <label htmlFor="club-name" className="text-body mb-1 block">
                                Название <span className="text-destructive">*</span>
                            </label>
                            <input
                                id="club-name"
                                type="text"
                                value={form.name}
                                onChange={(e) => setForm((f) => (f ? { ...f, name: e.target.value } : f))}
                                disabled={submitting}
                                className="w-full rounded border border-border bg-surface p-2 text-body"
                                maxLength={255}
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="club-address" className="text-body mb-1 block">
                                Адрес
                            </label>
                            <input
                                id="club-address"
                                type="text"
                                value={form.address}
                                onChange={(e) => setForm((f) => (f ? { ...f, address: e.target.value } : f))}
                                disabled={submitting}
                                className="w-full rounded border border-border bg-surface p-2 text-body"
                                maxLength={500}
                            />
                        </div>

                        <div>
                            <label htmlFor="club-phone" className="text-body mb-1 block">
                                Телефон
                            </label>
                            <input
                                id="club-phone"
                                type="text"
                                value={form.phone}
                                onChange={(e) => setForm((f) => (f ? { ...f, phone: e.target.value } : f))}
                                disabled={submitting}
                                className="w-full rounded border border-border bg-surface p-2 text-body"
                                maxLength={50}
                                placeholder="+7 999 555-12-34"
                            />
                        </div>

                        <div>
                            <label htmlFor="club-timezone" className="text-body mb-1 block">
                                Часовой пояс <span className="text-destructive">*</span>
                            </label>
                            <select
                                id="club-timezone"
                                value={form.timezone}
                                onChange={(e) => setForm((f) => (f ? { ...f, timezone: e.target.value } : f))}
                                disabled={submitting}
                                className="w-full rounded border border-border bg-surface p-2 text-body"
                            >
                                {RUSSIA_TIME_ZONES.map((z) => (
                                    <option key={z.id} value={z.id}>
                                        {z.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </section>

                    <section className="space-y-3">
                        <h3 className="heading-3">Часы работы</h3>
                        <WorkingHoursEditor
                            value={form.workingHours}
                            onChange={(next) => setForm((f) => (f ? { ...f, workingHours: next } : f))}
                            disabled={submitting}
                        />
                    </section>

                    <section className="space-y-3">
                        <h3 className="heading-3">Ссылка на карту</h3>
                        <p className="text-sm text-body-secondary">
                            Откройте клуб в Яндекс.Картах, нажмите «Поделиться» и вставьте ссылку сюда. По ней
                            посетители смогут построить маршрут.
                        </p>
                        <input
                            id="club-map-url"
                            type="url"
                            value={form.mapUrl}
                            onChange={(e) => setForm((f) => (f ? { ...f, mapUrl: e.target.value } : f))}
                            disabled={submitting}
                            className="w-full rounded border border-border bg-surface p-2 text-body"
                            maxLength={500}
                            placeholder="https://yandex.ru/maps/?pt=37.6173,55.7558&z=16"
                        />
                        {trimmedMapUrl && (
                            <a
                                href={trimmedMapUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-primary hover:underline"
                            >
                                Открыть в новой вкладке →
                            </a>
                        )}
                    </section>

                    {error && <p className="text-destructive">{error}</p>}
                    {success && <p className="text-primary">Сохранено</p>}

                    <button
                        type="submit"
                        disabled={submitting}
                        className="rounded bg-primary px-4 py-2 text-white hover:opacity-90 disabled:opacity-50"
                    >
                        {submitting ? 'Сохранение...' : 'Сохранить'}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default ClubInfoPage;
