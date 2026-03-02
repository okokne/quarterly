import { useMemo, useState } from "react";
import { Check, Fire, Plus } from "@phosphor-icons/react";
import { t as tr } from "../../i18n";
import { AppLanguage, Habit, Id } from "../../types";
import { Icon } from "../ui/Icon";
import { resolveHabitIcon } from "../ui/habitIcons";
import { addDays, parseIso, toIsoDate } from "../../utils";

type TodayHabitsSectionProps = {
    language: AppLanguage;
    isArchiveView: boolean;
    selectedDate: string;
    habits: Habit[];
    habitLog: Record<string, string[]>;
    getActiveHabitsForDate: (date: string) => Array<{ id: Id; title: string; emoji: string }>;
    onToggleHabit: (date: string, habitId: Id) => void;
    onDeleteHabit: (habitId: Id) => void;
    onOpenHabitsManager: () => void;
};

/** Returns the 7-day window ending at selectedDate (indices 0=oldest, 6=today) */
function get7DayWindow(selectedDate: string): string[] {
    return Array.from({ length: 7 }, (_, i) => addDays(selectedDate, i - 6));
}

/** Compute current streak ending at selectedDate for a habit */
function computeStreak(
    habit: Habit,
    habitLog: Record<string, string[]>,
    selectedDate: string
): number {
    let streak = 0;
    let date = selectedDate;
    const todayIso = toIsoDate(new Date());

    // Only count up to today
    if (date > todayIso) date = todayIso;

    for (let i = 0; i < 365; i++) {
        const log = habitLog[date] ?? [];
        if (log.includes(habit.id)) {
            streak++;
            date = addDays(date, -1);
        } else {
            break;
        }
    }
    return streak;
}

/** Compute success rate for the past 7 days (days where habit should fire) */
function computeWeeklySuccessRate(
    habit: Habit,
    habitLog: Record<string, string[]>,
    selectedDate: string
): number {
    const days = get7DayWindow(selectedDate);
    const todayIso = toIsoDate(new Date());
    let planned = 0;
    let done = 0;
    for (const d of days) {
        if (d > todayIso) continue;
        // Check if habit was active on this day
        const dayOfWeek = parseIso(d).getDay();
        let active = false;
        if (habit.frequency === "daily") active = true;
        else if (habit.frequency === "weekdays") active = dayOfWeek >= 1 && dayOfWeek <= 5;
        else if (Array.isArray(habit.frequency)) active = habit.frequency.includes(dayOfWeek);
        if (!active) continue;
        planned++;
        if ((habitLog[d] ?? []).includes(habit.id)) done++;
    }
    return planned === 0 ? 0 : Math.round((done / planned) * 100);
}

/** Map completion 0-100 to bar height 4-32px */
function barHeight(percent: number): number {
    return 4 + Math.round((percent / 100) * 28);
}

type HabitStreakCardProps = {
    habit: Habit;
    isToday: boolean;
    isDone: boolean;
    streak: number;
    successRate: number;
    window7: string[];
    habitLog: Record<string, string[]>;
    selectedDate: string;
    onToggle: () => void;
    language: AppLanguage;
};

const DAY_INITIALS_DE = ["S", "M", "D", "M", "D", "F", "S"]; // Sun=0
const DAY_INITIALS_EN = ["S", "M", "T", "W", "T", "F", "S"];

function HabitStreakCard({
    habit,
    isDone,
    streak,
    successRate,
    window7,
    habitLog,
    onToggle,
    language,
}: HabitStreakCardProps) {
    const [barHovered, setBarHovered] = useState<number | null>(null);
    const todayIso = toIsoDate(new Date());

    const successColor =
        successRate >= 80
            ? "#059669"
            : successRate >= 50
                ? "#D97706"
                : "#52525B";

    const DAY_INITIALS = language === "de" ? DAY_INITIALS_DE : DAY_INITIALS_EN;

    return (
        <article className={`hsc-card habit-card ${isDone ? "hsc-card-done" : ""}`}>
            {/* ── Header Row ─────────────────────────── */}
            <div className="hsc-header">
                <div className="hsc-info">
                    <div className="hsc-icon-wrap">
                        <Icon icon={resolveHabitIcon(habit.emoji)} size={16} />
                    </div>
                    <span className="hsc-name" title={habit.title}>
                        {habit.title}
                    </span>
                </div>
                <button
                    type="button"
                    className={`hsc-checkbox ${isDone ? "hsc-checkbox-checked" : ""}`}
                    onClick={onToggle}
                    aria-label={habit.title}
                >
                    {isDone && <Check size={14} weight="bold" color="#fff" />}
                </button>
            </div>

            {/* ── Streak + Success Rate ─────────────── */}
            <div className="hsc-meta">
                {streak > 0 ? (
                    <span className="hsc-streak-badge">
                        <Fire size={12} weight="fill" />
                        <span>{streak} {language === "de" ? "Tage" : "days"}</span>
                    </span>
                ) : (
                    <span className="hsc-streak-badge hsc-streak-zero">
                        {language === "de" ? "Start heute!" : "Start today!"}
                    </span>
                )}
                <span className="hsc-success-rate" style={{ color: successColor }}>
                    {successRate}% {language === "de" ? "diese Woche" : "this week"}
                </span>
            </div>

            {/* ── 7-Day Mini Graph ─────────────────── */}
            <div className="hsc-mini-graph">
                {window7.map((d, i) => {
                    const done7 = (habitLog[d] ?? []).includes(habit.id);
                    const isFuture = d > todayIso;
                    const pct = isFuture ? 0 : done7 ? 100 : 0;
                    const h = isFuture ? 4 : barHeight(pct);
                    const dayLabel = DAY_INITIALS[parseIso(d).getDay()] ?? "?";
                    const isHovered = barHovered === i;

                    return (
                        <div
                            key={d}
                            className="hsc-bar-col"
                            onMouseEnter={() => !isFuture && setBarHovered(i)}
                            onMouseLeave={() => setBarHovered(null)}
                        >
                            <div className="hsc-bar-track">
                                {isHovered && (
                                    <div className="hsc-bar-tooltip">
                                        {done7
                                            ? (language === "de" ? "✓ Erledigt" : "✓ Done")
                                            : (language === "de" ? "– Übersprungen" : "– Skipped")}
                                        <div className="hsc-bar-tooltip-arrow" />
                                    </div>
                                )}
                                <div
                                    className="hsc-bar-fill"
                                    style={{
                                        height: `${h}px`,
                                        background: isFuture
                                            ? "rgba(0,0,0,0.06)"
                                            : done7
                                                ? "#0070F3"
                                                : "rgba(0,0,0,0.06)",
                                        opacity: isHovered ? 0.7 : 1,
                                    }}
                                />
                            </div>
                            <span className="hsc-bar-label">{dayLabel}</span>
                        </div>
                    );
                })}
            </div>
        </article>
    );
}

export function TodayHabitsSection({
    language,
    isArchiveView,
    selectedDate,
    habits,
    habitLog,
    getActiveHabitsForDate,
    onToggleHabit,
    onOpenHabitsManager,
}: TodayHabitsSectionProps) {
    const activeHabits = useMemo(
        () => getActiveHabitsForDate(selectedDate),
        [getActiveHabitsForDate, selectedDate]
    );

    /** Full Habit objects for active habits (for streak computation) */
    const activeHabitsFull = useMemo(
        () =>
            activeHabits
                .map((ah) => habits.find((h) => h.id === ah.id))
                .filter((h): h is Habit => h !== undefined),
        [activeHabits, habits]
    );

    const window7 = useMemo(() => get7DayWindow(selectedDate), [selectedDate]);
    const doneIds = habitLog[selectedDate] ?? [];

    return (
        <div className="today-section">
            <div className="today-section-header">
                <div className="today-section-header-left">
                    <Fire size={18} weight="duotone" className="today-section-icon" aria-hidden="true" />
                    <h3 className="today-section-title">{tr(language, "today.habits")}</h3>
                </div>
                <button
                    type="button"
                    className="today-section-link"
                    onClick={onOpenHabitsManager}
                >
                    {tr(language, "common.manage")}
                </button>
            </div>

            {activeHabitsFull.length === 0 ? (
                <button
                    type="button"
                    className="hsc-empty-btn"
                    onClick={onOpenHabitsManager}
                    disabled={isArchiveView}
                >
                    <Plus size={18} />
                    <span>
                        {language === "de" ? "Erstes Habit erstellen" : "Create first habit"}
                    </span>
                </button>
            ) : (
                <div className="hsc-grid">
                    {activeHabitsFull.map((habit) => {
                        const isDone = doneIds.includes(habit.id);
                        const streak = computeStreak(habit, habitLog, selectedDate);
                        const successRate = computeWeeklySuccessRate(habit, habitLog, selectedDate);
                        return (
                            <HabitStreakCard
                                key={habit.id}
                                habit={habit}
                                isToday={selectedDate === toIsoDate(new Date())}
                                isDone={isDone}
                                streak={streak}
                                successRate={successRate}
                                window7={window7}
                                habitLog={habitLog}
                                selectedDate={selectedDate}
                                onToggle={() => !isArchiveView && onToggleHabit(selectedDate, habit.id)}
                                language={language}
                            />
                        );
                    })}
                </div>
            )}
        </div>
    );
}
