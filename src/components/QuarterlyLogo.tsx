type QuarterlyLogoProps = {
    size?: number;
    currentWeek?: number;
};

export function QuarterlyLogo({ size = 32, currentWeek = 1 }: QuarterlyLogoProps) {
    const safeWeek = Number.isFinite(currentWeek)
        ? Math.min(12, Math.max(0, Math.round(currentWeek)))
        : 1;
    const progress = safeWeek / 12;
    const canvasSize = 32;
    const squareSize = canvasSize / 5;
    const gap = squareSize * 0.2;
    const filled = Math.round(12 * progress);

    return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none" role="img" aria-label="Quarterly progress logo">
            {Array.from({ length: 12 }).map((_, i) => {
                const row = Math.floor(i / 3);
                const col = i % 3;
                const x = col * (squareSize + gap) + gap;
                const y = row * (squareSize + gap) + gap;
                const isFilled = i < filled;

                return (
                    <rect
                        key={i}
                        x={x}
                        y={y}
                        width={squareSize}
                        height={squareSize}
                        rx={squareSize * 0.15}
                        fill={isFilled ? "#0070F3" : "rgba(0, 112, 243, 0.15)"}
                        style={{ transition: "fill 300ms ease" }}
                    />
                );
            })}
        </svg>
    );
}
