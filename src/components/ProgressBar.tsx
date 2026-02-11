export function ProgressBar({ value, max, showLabel = true }: { value: number; max: number; showLabel?: boolean }) {
    const percent = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
    return (
        <div className="progress-bar">
            <div className="progress-bar-fill" style={{ width: `${percent}%` }} />
            {showLabel && (
                <span className="progress-bar-label">{value}/{max} ({percent}%)</span>
            )}
        </div>
    );
}
