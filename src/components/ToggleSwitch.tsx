export function ToggleSwitch({
    checked,
    onChange,
    ariaLabel
}: {
    checked: boolean;
    onChange: (val: boolean) => void;
    ariaLabel?: string;
}) {
    return (
        <button
            type="button"
            className={`toggle-switch ${checked ? 'toggle-on' : ''}`}
            onClick={() => onChange(!checked)}
            aria-checked={checked}
            aria-label={ariaLabel}
            role="switch"
        >
            <span className="toggle-thumb" />
        </button>
    );
}
