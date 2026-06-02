/**
 * Story 5.4 — minimal backoff helper for out-of-band notifications.
 *
 * Runs `fn` up to `delays.length + 1` times. Sleeps `delays[i]` ms between
 * attempts. Throws the final attempt's error if every attempt fails. No
 * jitter, no abort signal — keep it small.
 */
export async function withRetry<T>(fn: () => Promise<T>, delays: number[]): Promise<T> {
    let lastError: unknown;
    const totalAttempts = delays.length + 1;
    for (let attempt = 0; attempt < totalAttempts; attempt++) {
        try {
            return await fn();
        } catch (err) {
            lastError = err;
            const delay = delays[attempt];
            if (delay === undefined) break;
            await new Promise<void>((resolve) => setTimeout(resolve, delay));
        }
    }
    throw lastError;
}

/** Default backoff schedule for change/cancellation notifications (per Story 5.4 AC6). */
export const DEFAULT_NOTIFICATION_BACKOFF_MS = [1_000, 5_000, 30_000];
