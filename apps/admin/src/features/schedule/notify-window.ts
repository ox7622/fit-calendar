import type { IConfirmRequest, IConfirmResult } from '@/shared/components/ConfirmDialog';
import { NOTIFY_WINDOW_DAYS } from '@fitcalendar/shared';

const WINDOW_MS = NOTIFY_WINDOW_DAYS * 24 * 60 * 60 * 1000;

/** Warning shown before an action that will push to every bot user. */
export const PUSH_WARNING = 'Занятие в ближайшие 5 дней. Все пользователи бота получат пуш-уведомление об этом.';

/** Cancellation-specific variant of {@link PUSH_WARNING}. */
export const PUSH_WARNING_CANCEL = 'Занятие в ближайшие 5 дней. Все пользователи бота получат пуш об отмене.';

/** True when the ISO start time is between now and now + 5 days (inclusive). */
export function isWithinNotifyWindow(startTimeIso: string, now: Date = new Date()): boolean {
    const t = new Date(startTimeIso).getTime();
    if (Number.isNaN(t)) return false;
    return t >= now.getTime() && t <= now.getTime() + WINDOW_MS;
}

/**
 * Shared gate for create/edit-style actions: if the class is within the notify
 * window, ask the admin to confirm and let them opt out of the push; otherwise
 * proceed silently. Returns whether to proceed and the chosen `notify` value.
 */
export async function confirmNotify(
    confirm: (req: IConfirmRequest) => Promise<IConfirmResult>,
    startTimeIso: string,
    opts: { title: string; confirmLabel: string },
): Promise<{ proceed: boolean; notify: boolean }> {
    if (!isWithinNotifyWindow(startTimeIso)) {
        return { proceed: true, notify: true };
    }
    const res = await confirm({
        title: opts.title,
        message: `${PUSH_WARNING} Продолжить?`,
        confirmLabel: opts.confirmLabel,
        notifyToggle: true,
    });
    return { proceed: res.confirmed, notify: res.notify };
}
