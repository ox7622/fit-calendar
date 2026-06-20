import { detectImageFormat } from '../image-magic-bytes';

const buf = (...bytes: number[]): Buffer => Buffer.from(bytes);

describe('detectImageFormat', () => {
    it('detects JPEG (FF D8 FF prefix)', () => {
        // Real JPEGs vary in the 4th byte (E0/E1/etc for APP0/APP1) so we only
        // need the first three. Padding with zeros so length >= 12.
        const b = buf(0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0);
        expect(detectImageFormat(b)).toBe('jpeg');
    });

    it('detects PNG (full 8-byte signature)', () => {
        const b = buf(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0);
        expect(detectImageFormat(b)).toBe('png');
    });

    it('detects GIF87a + GIF89a (both via the GIF8 prefix)', () => {
        const gif87 = buf(0x47, 0x49, 0x46, 0x38, 0x37, 0x61, 0, 0, 0, 0, 0, 0);
        const gif89 = buf(0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0, 0, 0, 0, 0, 0);
        expect(detectImageFormat(gif87)).toBe('gif');
        expect(detectImageFormat(gif89)).toBe('gif');
    });

    it('detects WebP via the WEBP marker at offset 8', () => {
        // RIFF<4-byte size>WEBP — the size bytes can be anything.
        const b = buf(0x52, 0x49, 0x46, 0x46, 0xde, 0xad, 0xbe, 0xef, 0x57, 0x45, 0x42, 0x50);
        expect(detectImageFormat(b)).toBe('webp');
    });

    it('returns null for a renamed HTML file with image MIME spoof', () => {
        // "<!DOCTYPE html>" — what an attacker might POST as image/jpeg.
        const html = Buffer.from('<!DOCTYPE html><script>...');
        expect(detectImageFormat(html)).toBeNull();
    });

    it('returns null for SVG (we intentionally do not accept XML payloads)', () => {
        const svg = Buffer.from('<?xml version="1.0"?><svg xmlns="..." />');
        expect(detectImageFormat(svg)).toBeNull();
    });

    it('returns null for buffers shorter than the minimum lookahead', () => {
        expect(detectImageFormat(buf(0xff, 0xd8))).toBeNull();
    });

    it('returns null for empty / undefined buffers', () => {
        expect(detectImageFormat(Buffer.alloc(0))).toBeNull();
        // The check is null-safe for callers that hand in a falsy buffer.
        expect(detectImageFormat(null as unknown as Buffer)).toBeNull();
    });

    it('returns null for valid-looking RIFF but wrong type at offset 8 (AVI, not WebP)', () => {
        // RIFF + AVI tag — common false-positive trap for naive RIFF detectors.
        const avi = buf(0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x41, 0x56, 0x49, 0x20);
        expect(detectImageFormat(avi)).toBeNull();
    });
});
