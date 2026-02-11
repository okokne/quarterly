export function ProgressRing({ value, max, size = 64, strokeWidth = 6 }: { value: number; max: number; size?: number; strokeWidth?: number }) {
    const percent = max > 0 ? Math.min(100, (value / max) * 100) : 0;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (percent / 100) * circumference;

    return (
        <div className="progress-ring-container">
            <svg className="progress-ring" width={size} height={size}>
                <circle
                    className="progress-ring-bg"
                    strokeWidth={strokeWidth}
                    fill="none"
                    r={radius}
                    cx={size / 2}
                    cy={size / 2}
                />
                <circle
                    className="progress-ring-fill"
                    strokeWidth={strokeWidth}
                    fill="none"
                    r={radius}
                    cx={size / 2}
                    cy={size / 2}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                />
            </svg>
            <span className="progress-ring-text">{Math.round(percent)}%</span>
        </div>
    );
}
