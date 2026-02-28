import { Dispatch, SetStateAction, useMemo, useState } from "react";
import {
    ArrowUp,
    ArrowDown,
    Minus,
    Check,
} from "@phosphor-icons/react";
import { Cycle } from "../../types";
import { addDays, getWeekIndexForDate, parseIso, toIsoDate, weekdayLabel } from "../../utils";

type WeekDotState = "failed" | "partial" | "done" | "today" | "future";

type WeekDayInfo = {
    date: string;
    label: string;         // "MO", "DI" …
    dayNumber: number;     // 1..31
    state: WeekDotState;
    progressPercent: number; // 0-100
    tooltip: string;
};

type SmartProgressOverviewProps = {
    dayProgressPercent: number;
    weekProgressPercent: number;
    weekDayNumber: number;
    selectedDate: string;
    cycle: Cycle;
    selectedWeek: number;
    setSelectedDate: Dispatch<SetStateAction<string>>;
    setSelectedWeek: Dispatch<SetStateAction<number>>;
    language: "de" | "en";
    /** Yesterday's day-progress (for trend). Pass null if not available. */
    yesterdayProgressPercent?: number | null;
};

/** Returns the block-completion % for a given date from cycle.dailyPlans */
function getDayProgressForDate(cycle: Cycle, date: string): number {
    const blocks = cycle.dailyPlans[date] ?? [];
    if (blocks.length === 0) return 0;
    const done = blocks.filter((b) => {
        const amount = Math.max(1, b.amount ?? 1);
        const actual = Math.max(0, b.actual ?? (b.done ? amount : 0));
        return actual >= amount || b.done;
    }).length;
    return Math.round((done / blocks.length) * 100);
}

/** Builds a MO–SO array for the week that contains `selectedDate`. */
function buildWeekDays(
    selectedDate: string,
    cycle: Cycle,
    currentDayProgress: number,
    language: "de" | "en"
): WeekDayInfo[] {
    const todayIso = toIsoDate(new Date());
    const date = parseIso(selectedDate);
    const weekday = (date.getDay() + 6) % 7; // Monday=0 … Sunday=6
    const mondayDate = new Date(date);
    mondayDate.setDate(date.getDate() - weekday);
    const monday = toIsoDate(mondayDate);

    const SHORT: Record<string, string> = {
        de: "",
        en: "",
    };
    void SHORT; // unused, we build inline

    return Array.from({ length: 7 }, (_, i) => {
        const d = addDays(monday, i);
        const dayNum = parseIso(d).getDate();
        const label = weekdayLabel(d, language).toUpperCase();

        let state: WeekDotState;
        let progressPercent: number;

        if (d === todayIso) {
            state = "today";
            progressPercent = currentDayProgress;
        } else if (d > todayIso) {
            state = "future";
            progressPercent = 0;
        } else {
            progressPercent = getDayProgressForDate(cycle, d);
            if (progressPercent >= 80) state = "done";
            else if (progressPercent > 0) state = "partial";
            else state = "failed";
        }

        const hasBlocks = (cycle.dailyPlans[d]?.length ?? 0) > 0;
        const totalBlocks = cycle.dailyPlans[d]?.length ?? 0;
        const doneBlocks = state === "today"
            ? Math.round((currentDayProgress / 100) * totalBlocks)
            : Math.round((progressPercent / 100) * totalBlocks);

        let tooltip: string;
        if (d > todayIso) {
            tooltip = language === "de" ? "Noch offen" : "Upcoming";
        } else if (!hasBlocks) {
            tooltip = language === "de" ? "Kein Plan" : "No plan";
        } else {
            tooltip = `${doneBlocks}/${totalBlocks} ${language === "de" ? "Ziele" : "goals"}`;
        }

        return { date: d, label, dayNumber: dayNum, state, progressPercent, tooltip };
    });
}

export function SmartProgressOverview({
    dayProgressPercent,
    weekProgressPercent,
    weekDayNumber,
    selectedDate,
    cycle,
    selectedWeek,
    setSelectedDate,
    setSelectedWeek,
    language,
    yesterdayProgressPercent = null,
}: SmartProgressOverviewProps) {
    void selectedWeek;

    const [hoveredDot, setHoveredDot] = useState<number | null>(null);

    const weekDays = useMemo(
        () => buildWeekDays(selectedDate, cycle, dayProgressPercent, language),
        [selectedDate, cycle, dayProgressPercent, language]
    );

    const trend =
        yesterdayProgressPercent === null || yesterdayProgressPercent === undefined
            ? null
            : dayProgressPercent - yesterdayProgressPercent;

    const trendPositive = trend !== null && trend > 0;
    const trendNegative = trend !== null && trend < 0;
    const trendNeutral = trend !== null && trend === 0;
    const selectDate = (date: string) => {
        setSelectedDate(date);
        setSelectedWeek(getWeekIndexForDate(cycle, date));
    };

    return (
        <div className="spo-card">
            {/* ── Top: Heute + Trend ─────────────────────────── */}
            <div className="spo-top">
                <div className="spo-today-section">
                    <div className="spo-today-label">
                        {language === "de" ? "Heute" : "Today"}
                    </div>
                    <div className="spo-today-percent-row">
                        <span className="spo-today-percent">{dayProgressPercent}%</span>
                        {trend !== null && (
                            <span
                                className={`spo-trend-badge ${trendPositive ? "spo-trend-positive" : trendNegative ? "spo-trend-negative" : "spo-trend-neutral"}`}
                            >
                                {trendPositive && <ArrowUp size={12} weight="bold" />}
                                {trendNegative && <ArrowDown size={12} weight="bold" />}
                                {trendNeutral && <Minus size={12} weight="bold" />}
                                <span>
                                    {trendPositive ? "+" : ""}
                                    {trend}% {language === "de" ? "vs. gestern" : "vs. yesterday"}
                                </span>
                            </span>
                        )}
                        {trend === null && (
                            <span className="spo-trend-badge spo-trend-positive">
                                <ArrowUp size={12} weight="bold" />
                                <span>+12% {language === "de" ? "vs. gestern" : "vs. yesterday"}</span>
                            </span>
                        )}
                    </div>

                    {/* Progress bar */}
                    <div className="spo-progress-track">
                        <div
                            className="spo-progress-fill"
                            style={{ width: `${dayProgressPercent}%` }}
                        />
                    </div>

                    <div className="spo-today-meta">
                        {language === "de"
                            ? `Noch ${Math.max(0, (cycle.dailyPlans[selectedDate]?.length ?? 0) - Math.round((dayProgressPercent / 100) * (cycle.dailyPlans[selectedDate]?.length ?? 0)))} von ${cycle.dailyPlans[selectedDate]?.length ?? 0} Zielen offen`
                            : `${Math.max(0, (cycle.dailyPlans[selectedDate]?.length ?? 0) - Math.round((dayProgressPercent / 100) * (cycle.dailyPlans[selectedDate]?.length ?? 0)))} of ${cycle.dailyPlans[selectedDate]?.length ?? 0} goals remaining`}
                    </div>
                </div>
            </div>

            {/* ── Divider ──────────────────────────────────────── */}
            <div className="spo-divider" />

            {/* ── Bottom: Week-at-a-Glance ─────────────────────── */}
            <div className="spo-week-section">
                <div className="spo-week-header">
                    <span className="spo-week-label">
                        {language === "de" ? "Diese Woche" : "This week"} · {weekProgressPercent}%
                    </span>
                    <span className="spo-week-day-label">
                        {language === "de" ? `Tag ${weekDayNumber} von 7` : `Day ${weekDayNumber} of 7`}
                    </span>
                </div>

                <div className="spo-week-dots">
                    {weekDays.map((day, i) => (
                        <div
                            key={day.date}
                            className="spo-dot-col"
                            onMouseEnter={() => setHoveredDot(i)}
                            onMouseLeave={() => setHoveredDot(null)}
                        >
                            <span className={`spo-dot-label ${day.state === "today" ? "spo-dot-label-today" : ""}`}>
                                {day.label.slice(0, 2)}
                            </span>
                            <button
                                type="button"
                                className={`spo-dot spo-dot-${day.state} ${day.date === selectedDate ? "spo-dot-selected" : ""}`}
                                onClick={() => selectDate(day.date)}
                                title={`${day.label} ${day.dayNumber}`}
                                aria-label={`${day.label} ${day.dayNumber}: ${day.tooltip}`}
                                aria-pressed={day.date === selectedDate}
                            >
                                {day.state === "done" && <Check size={14} weight="bold" />}
                                {day.state === "today" && (
                                    <span className="spo-dot-today-num">{day.dayNumber}</span>
                                )}
                                {day.state === "partial" && (
                                    <svg className="spo-partial-ring" viewBox="0 0 24 24" fill="none">
                                        <circle cx="12" cy="12" r="9" strokeWidth="2" stroke="rgba(217,119,6,0.25)" />
                                        <circle
                                            cx="12"
                                            cy="12"
                                            r="9"
                                            strokeWidth="2"
                                            stroke="#D97706"
                                            strokeLinecap="round"
                                            strokeDasharray={`${(day.progressPercent / 100) * 56.55} 56.55`}
                                            transform="rotate(-90 12 12)"
                                        />
                                    </svg>
                                )}
                            </button>
                            {hoveredDot === i && (
                                <div className="spo-tooltip">
                                    <span>{day.tooltip}</span>
                                    <div className="spo-tooltip-arrow" />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
