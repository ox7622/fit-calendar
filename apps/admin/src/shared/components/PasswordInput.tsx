import { useState } from 'react';

import { Eye, EyeOff } from 'lucide-react';

interface IPasswordInputProps {
    id: string;
    value: string;
    onChange: (next: string) => void;
    autoComplete: 'current-password' | 'new-password';
    disabled?: boolean;
    required?: boolean;
    'aria-invalid'?: boolean;
    'aria-describedby'?: string;
}

export function PasswordInput({
    id,
    value,
    onChange,
    autoComplete,
    disabled,
    required,
    'aria-invalid': ariaInvalid,
    'aria-describedby': ariaDescribedBy,
}: IPasswordInputProps) {
    const [shown, setShown] = useState(false);

    return (
        <div className="relative">
            <input
                id={id}
                type={shown ? 'text' : 'password'}
                autoComplete={autoComplete}
                required={required}
                aria-invalid={ariaInvalid}
                aria-describedby={ariaDescribedBy}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full rounded-md border border-input bg-background pl-3 pr-10 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                disabled={disabled}
            />
            <button
                type="button"
                onClick={() => setShown((v) => !v)}
                aria-label={shown ? 'Скрыть пароль' : 'Показать пароль'}
                aria-pressed={shown}
                tabIndex={-1}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-body-secondary hover:text-foreground focus:outline-none focus:text-foreground"
            >
                {shown ? (
                    <EyeOff className="w-4 h-4" aria-hidden="true" />
                ) : (
                    <Eye className="w-4 h-4" aria-hidden="true" />
                )}
            </button>
        </div>
    );
}
