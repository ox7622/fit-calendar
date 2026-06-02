/**
 * Magic-byte sniffing for upload endpoints.
 *
 * `Express.Multer.File.mimetype` is set from the client's `Content-Type`
 * header — trivially spoofable. A renamed `.html` posted as `image/jpeg`
 * would sail past `file.mimetype.startsWith('image/')` and end up on
 * Cloudinary. We refuse uploads whose first bytes don't match a known
 * image signature.
 *
 * Limited set on purpose — these are the formats Cloudinary's coach photo
 * + club logo flows accept. SVG is intentionally excluded (XML payload
 * with potential script content). Add formats explicitly when we have a
 * concrete reason; don't paste in a 50-format library.
 */
export type TImageFormat = 'jpeg' | 'png' | 'webp' | 'gif';

interface IMagicBytePattern {
    format: TImageFormat;
    /** Bytes to match starting at offset 0 unless `offset` is set. */
    bytes: number[];
    offset?: number;
}

const PATTERNS: IMagicBytePattern[] = [
    { format: 'jpeg', bytes: [0xff, 0xd8, 0xff] },
    { format: 'png', bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
    { format: 'gif', bytes: [0x47, 0x49, 0x46, 0x38] }, // GIF8 — covers both GIF87a and GIF89a
    // WebP: 'RIFF' at 0, 'WEBP' at 8. We check the WEBP marker which is the discriminator.
    { format: 'webp', bytes: [0x57, 0x45, 0x42, 0x50], offset: 8 },
];

/**
 * Returns the detected format, or `null` when no known image signature
 * matches the leading bytes of `buffer`. Caller decides what to do with
 * `null` (typically: throw 400).
 */
export function detectImageFormat(buffer: Buffer): TImageFormat | null {
    if (!buffer || buffer.length < 12) return null;
    for (const pattern of PATTERNS) {
        const offset = pattern.offset ?? 0;
        if (buffer.length < offset + pattern.bytes.length) continue;
        let matches = true;
        for (let i = 0; i < pattern.bytes.length; i++) {
            if (buffer[offset + i] !== pattern.bytes[i]) {
                matches = false;
                break;
            }
        }
        if (matches) return pattern.format;
    }
    return null;
}
