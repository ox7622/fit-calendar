import { createHash, randomBytes } from 'crypto';

export function sha256Hex(plaintext: string): string {
    return createHash('sha256').update(plaintext).digest('hex');
}

export function generateUrlSafeToken(bytes = 32): string {
    return randomBytes(bytes).toString('base64url');
}
