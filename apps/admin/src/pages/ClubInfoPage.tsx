import { useEffect, useState, type FormEvent } from 'react';

import { ClubLogoUpload } from '@/features/club/ClubLogoUpload';
import { CoordinatesInput } from '@/features/club/CoordinatesInput';
import { WorkingHoursEditor } from '@/features/club/WorkingHoursEditor';
import { adminClubApi, ApiError, type IAdminClubInfo, type TWorkingHours } from '@/shared/api';

interface IFormState {
    name: string;
    address: string;
    phone: string;
    workingHours: TWorkingHours;
    latitude: number | null;
    longitude: number | null;
}

const EMPTY_FORM: IFormState = {
    name: '',
    address: '',
    phone: '',
    workingHours: {},
    latitude: null,
    longitude: null,
};

export function ClubInfoPage() {
    const [club, setClub] = useState<IAdminClubInfo | null>(null);
    const [form, setForm] = useState<IFormState>(EMPTY_FORM);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [geocoding, setGeocoding] = useState(false);
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
                    latitude: data.latitude,
                    longitude: data.longitude,
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
        setError(null);
        setSuccess(false);

        if ((form.latitude === null) !== (form.longitude === null)) {
            setError('Укажите широту и долготу вместе или оставьте оба пустыми');
            return;
        }

        setSubmitting(true);
        try {
            const updated = await adminClubApi.update({
                name: form.name.trim(),
                address: form.address.trim(),
                phone: form.phone.trim() || undefined,
                workingHours: form.workingHours,
                latitude: form.latitude ?? undefined,
                longitude: form.longitude ?? undefined,
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

    const handleGeocode = async (): Promise<void> => {
        const address = form.address.trim();
        if (!address) {
            setError('Сначала укажите адрес');
            return;
        }
        setError(null);
        setGeocoding(true);
        try {
            const { latitude, longitude } = await adminClubApi.geocode(address);
            setForm((f) => ({ ...f, latitude, longitude }));
        } catch (err) {
            if (err instanceof ApiError) {
                const body = err.data as { message?: string } | null;
                setError(body?.message ?? 'Не удалось определить координаты');
            } else {
                setError('Не удалось определить координаты');
            }
        } finally {
            setGeocoding(false);
        }
    };

    if (loading) return <p className="p-6 text-body-secondary">Загрузка...</p>;
    if (error && !club) return <p className="p-6 text-destructive">{error}</p>;

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
                                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
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
                                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
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
                                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                                disabled={submitting}
                                className="w-full rounded border border-border bg-surface p-2 text-body"
                                maxLength={50}
                                placeholder="+7 999 555-12-34"
                            />
                        </div>
                    </section>

                    <section className="space-y-3">
                        <h3 className="heading-3">Часы работы</h3>
                        <WorkingHoursEditor
                            value={form.workingHours}
                            onChange={(next) => setForm((f) => ({ ...f, workingHours: next }))}
                            disabled={submitting}
                        />
                    </section>

                    <section className="space-y-3">
                        <h3 className="heading-3">Местоположение</h3>
                        <CoordinatesInput
                            latitude={form.latitude}
                            longitude={form.longitude}
                            onChange={(lat, lon) => setForm((f) => ({ ...f, latitude: lat, longitude: lon }))}
                            disabled={submitting || geocoding}
                        />
                        <button
                            type="button"
                            onClick={handleGeocode}
                            disabled={submitting || geocoding || !form.address.trim()}
                            className="rounded border border-border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
                        >
                            {geocoding ? 'Определяем…' : '📍 Определить по адресу'}
                        </button>
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
