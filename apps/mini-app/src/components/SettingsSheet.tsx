import { X } from 'lucide-react';
import { useState } from 'react';

import { REMINDER_MINUTES_OPTIONS, type TReminderMinutes } from '@/shared/api';

const OPTION_LABELS: Record<TReminderMinutes, string> = {
    15: '15 минут до',
    30: '30 минут до',
    60: '1 час до',
    120: '2 часа до',
};

interface SettingsSheetProps {
    currentValue: number;
    /**
     * Resolves on persistence success. The sheet keeps the chip pending
     * while this promise is in flight; the caller (RemindersPage) is
     * responsible for the toast + store update on success/failure.
     */
    onChange: (value: TReminderMinutes) => Promise<void>;
    onClose: () => void;
}

export function SettingsSheet({ currentValue, onChange, onClose }: SettingsSheetProps): JSX.Element {
    const [pendingValue, setPendingValue] = useState<TReminderMinutes | null>(null);

    const handleSelect = async (value: TReminderMinutes): Promise<void> => {
        if (pendingValue !== null) return; // an option is already in flight
        if (value === currentValue) return; // no-op
        setPendingValue(value);
        try {
            await onChange(value);
        } finally {
            setPendingValue(null);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex flex-col justify-end animate-[fade-in_0.15s_ease-out]">
            <button
                type="button"
                className="absolute inset-0 bg-black/50"
                onClick={onClose}
                aria-label="Закрыть настройки"
            />

            <div className="relative bg-background rounded-t-2xl flex flex-col animate-[slide-up_0.3s_ease-out]">
                <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border/50">
                    <h2 className="heading-3">Настройки</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                        aria-label="Закрыть"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="px-4 py-5 space-y-3">
                    <div>
                        <p className="text-sm font-semibold text-muted-foreground mb-2">Когда напоминать</p>
                        <div className="grid grid-cols-2 gap-2">
                            {REMINDER_MINUTES_OPTIONS.map((value) => {
                                const isSelected = value === currentValue;
                                const isPending = value === pendingValue;
                                const isDisabled = pendingValue !== null && !isPending;
                                return (
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() => handleSelect(value)}
                                        disabled={isDisabled || isSelected}
                                        className={
                                            isSelected
                                                ? 'rounded-xl px-3 py-3 text-sm font-medium border bg-primary/20 text-primary border-primary/30 disabled:cursor-default'
                                                : 'rounded-xl px-3 py-3 text-sm font-medium border bg-card text-foreground border-border transition-colors active:bg-muted disabled:opacity-50 disabled:cursor-not-allowed'
                                        }
                                    >
                                        {isPending ? (
                                            <span className="inline-flex items-center gap-2">
                                                <span
                                                    aria-hidden
                                                    className="inline-block w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin"
                                                />
                                                Сохраняем...
                                            </span>
                                        ) : (
                                            OPTION_LABELS[value]
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
