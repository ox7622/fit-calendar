/** Label for the "notify users" opt-out checkbox shown in push confirmations. */
export const NOTIFY_USERS_LABEL = 'Уведомить пользователей';

interface INotifyCheckboxProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
}

/** The "notify users" opt-out checkbox shared by every schedule push confirmation. */
export function NotifyCheckbox({ checked, onChange }: INotifyCheckboxProps): JSX.Element {
    return (
        <label className="text-body mb-4 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4" />
            {NOTIFY_USERS_LABEL}
        </label>
    );
}
