/**
 * Story 7.2 — phone normalization for Russian numbers.
 *
 * Reception collects member phone numbers in many shapes:
 *   `+7 (495) 123-45-67`, `8-495-123-45-67`, `74951234567`, `89951234567`, `4951234567`.
 * The Mini App's link-phone form lets members type them in any of those forms too.
 *
 * Normalize to canonical `+7XXXXXXXXXX` (12 chars including the `+`) so storage
 * and lookup use a single shape. Reject non-Russian numbers — single-region MVP.
 *
 * Returns `null` (not a thrown error) so callers can map to a 400 with the
 * `INVALID_PHONE_FORMAT` machine code per AC7.
 */
export function normalizeRussianPhone(input: string): string | null {
    if (!input) return null;

    const digits = input.replace(/\D/g, '');

    // 11 digits starting with 8 → swap to 7 (e.g. 89951234567 → +79951234567)
    if (digits.length === 11 && digits.startsWith('8')) {
        return `+7${digits.slice(1)}`;
    }

    // 11 digits starting with 7 → already canonical
    if (digits.length === 11 && digits.startsWith('7')) {
        return `+${digits}`;
    }

    // 10 digits → assume Russian, prepend country code
    if (digits.length === 10) {
        return `+7${digits}`;
    }

    return null;
}
