interface ICoordinatesInputProps {
    latitude: number | null;
    longitude: number | null;
    onChange: (lat: number | null, lon: number | null) => void;
    disabled?: boolean;
}

/**
 * Story 6.7 — latitude/longitude must be provided together or both null
 * (AC5). We let the user type partial values during editing; the
 * paired-or-both-null check fires on form submit. A short hint warns
 * inline when one is set without the other.
 */
export function CoordinatesInput({ latitude, longitude, onChange, disabled }: ICoordinatesInputProps) {
    const parse = (raw: string): number | null => {
        const trimmed = raw.trim();
        if (trimmed === '') return null;
        const n = Number(trimmed);
        return Number.isFinite(n) ? n : null;
    };

    const oneOnly = (latitude === null) !== (longitude === null);

    return (
        <div className="space-y-1">
            <div className="flex flex-wrap gap-3">
                <label className="flex flex-col gap-1">
                    <span className="text-sm text-body-secondary">Широта</span>
                    <input
                        type="text"
                        inputMode="decimal"
                        value={latitude ?? ''}
                        onChange={(e) => onChange(parse(e.target.value), longitude)}
                        disabled={disabled}
                        className="w-36 rounded border border-border bg-surface p-2 text-body"
                        placeholder="55.7558"
                    />
                </label>
                <label className="flex flex-col gap-1">
                    <span className="text-sm text-body-secondary">Долгота</span>
                    <input
                        type="text"
                        inputMode="decimal"
                        value={longitude ?? ''}
                        onChange={(e) => onChange(latitude, parse(e.target.value))}
                        disabled={disabled}
                        className="w-36 rounded border border-border bg-surface p-2 text-body"
                        placeholder="37.6173"
                    />
                </label>
            </div>
            {oneOnly && <p className="text-sm text-destructive">Укажите оба значения или оставьте оба пустыми</p>}
            {latitude !== null && longitude !== null && (
                <a
                    href={`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                >
                    Посмотреть на карте →
                </a>
            )}
        </div>
    );
}

export default CoordinatesInput;
