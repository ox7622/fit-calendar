/**
 * Maximum size for multipart uploads, enforced server-side by Multer
 * (`fileSize`) and mirrored client-side by admin upload widgets to give
 * pre-submit feedback instead of waiting for a 413.
 */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
