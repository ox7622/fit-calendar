/**
 * Russian user-facing error messages for multipart upload endpoints.
 * Centralised so the admin panel sees a single phrasing regardless of which
 * controller (coach photo, club logo, customer CSV) the upload hit.
 */
export const UPLOAD_ERRORS = {
    FILE_REQUIRED: 'Файл не загружен',
    UNSUPPORTED_IMAGE_TYPE: 'Поддерживаются только изображения JPEG / PNG / WebP / GIF',
} as const;
