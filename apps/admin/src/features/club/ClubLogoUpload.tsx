import { useRef, useState, type ChangeEvent, type DragEvent } from 'react';

import { MAX_UPLOAD_BYTES } from '@fitcalendar/shared';
import { ImageIcon } from 'lucide-react';

interface IClubLogoUploadProps {
    currentUrl: string | null;
    onUpload: (file: File) => Promise<{ logoUrl: string }>;
    disabled?: boolean;
}

/**
 * Story 6.7 — square logo upload. Same upload-on-pick pattern as
 * `CoachPhotoUpload` but with a square preview (no circular crop) since a
 * logo isn't a portrait. Could be folded into a generic `ImageUpload` once
 * a third upload widget shows up.
 */
export function ClubLogoUpload({ currentUrl, onUpload, disabled }: IClubLogoUploadProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [preview, setPreview] = useState<string | null>(currentUrl);
    const [error, setError] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [dragging, setDragging] = useState(false);

    const validate = (file: File): string | null => {
        if (!file.type.startsWith('image/')) return 'Поддерживаются только изображения';
        if (file.size > MAX_UPLOAD_BYTES) return 'Файл больше 5 МБ';
        return null;
    };

    const handleFile = async (file: File): Promise<void> => {
        const validationError = validate(file);
        if (validationError) {
            setError(validationError);
            return;
        }
        setError(null);
        const localUrl = URL.createObjectURL(file);
        setPreview(localUrl);
        setUploading(true);
        try {
            const { logoUrl } = await onUpload(file);
            setPreview(logoUrl);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Не удалось загрузить логотип');
            setPreview(currentUrl);
        } finally {
            URL.revokeObjectURL(localUrl);
            setUploading(false);
        }
    };

    const onFileInputChange = (e: ChangeEvent<HTMLInputElement>): void => {
        const file = e.target.files?.[0];
        if (file) void handleFile(file);
        e.target.value = '';
    };

    const onDrop = (e: DragEvent<HTMLDivElement>): void => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) void handleFile(file);
    };

    return (
        <div>
            <div
                onClick={() => !disabled && !uploading && inputRef.current?.click()}
                onDragOver={(e) => {
                    e.preventDefault();
                    setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                className={`relative flex h-[160px] w-[160px] cursor-pointer items-center justify-center overflow-hidden rounded border-2 ${
                    dragging ? 'border-primary bg-primary/10' : 'border-dashed border-border bg-surface'
                } ${disabled || uploading ? 'cursor-not-allowed opacity-60' : ''}`}
                role="button"
                aria-label="Загрузить логотип"
            >
                {preview ? (
                    <img src={preview} alt="Логотип клуба" className="h-full w-full object-contain" />
                ) : (
                    <div className="flex flex-col items-center gap-2 text-body-secondary">
                        <ImageIcon className="h-8 w-8" />
                        <span className="text-xs">Перетащите или нажмите</span>
                    </div>
                )}
                {uploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-sm text-white">
                        Загрузка...
                    </div>
                )}
            </div>
            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                onChange={onFileInputChange}
                className="hidden"
                disabled={disabled || uploading}
            />
            {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
            <p className="mt-1 text-xs text-body-secondary">JPEG / PNG / SVG, до 5 МБ</p>
        </div>
    );
}

export default ClubLogoUpload;
