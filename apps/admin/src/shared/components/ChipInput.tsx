import { useState, type KeyboardEvent } from 'react';

interface IChipInputProps {
    values: string[];
    onChange: (next: string[]) => void;
    placeholder?: string;
    maxItems?: number;
    disabled?: boolean;
}

/**
 * Hand-rolled chip input — Enter to commit, click × to remove. No external
 * lib. Used by Story 6.5's coach form for specializations + certifications.
 */
export function ChipInput({ values, onChange, placeholder, maxItems = 20, disabled }: IChipInputProps) {
    const [draft, setDraft] = useState('');

    const commit = (): void => {
        const v = draft.trim();
        if (!v) {
            setDraft('');
            return;
        }
        if (values.includes(v)) {
            setDraft('');
            return;
        }
        if (values.length >= maxItems) return;
        onChange([...values, v]);
        setDraft('');
    };

    const remove = (value: string): void => {
        onChange(values.filter((v) => v !== value));
    };

    const onKeyDown = (e: KeyboardEvent<HTMLInputElement>): void => {
        if (e.key === 'Enter') {
            e.preventDefault();
            commit();
        }
        if (e.key === 'Backspace' && draft === '' && values.length > 0) {
            const last = values[values.length - 1];
            if (last !== undefined) remove(last);
        }
    };

    return (
        <div className="flex flex-wrap gap-1 rounded border border-border bg-surface p-2">
            {values.map((v) => (
                <span
                    key={v}
                    className="inline-flex items-center gap-1 rounded bg-primary/15 px-2 py-0.5 text-sm text-primary"
                >
                    {v}
                    <button
                        type="button"
                        onClick={() => remove(v)}
                        disabled={disabled}
                        className="text-primary/70 hover:text-primary"
                        aria-label={`Удалить ${v}`}
                    >
                        ×
                    </button>
                </span>
            ))}
            <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={onKeyDown}
                onBlur={commit}
                disabled={disabled || values.length >= maxItems}
                placeholder={values.length === 0 ? placeholder : ''}
                className="min-w-[8ch] flex-1 bg-transparent text-sm outline-none disabled:cursor-not-allowed"
            />
        </div>
    );
}

export default ChipInput;
