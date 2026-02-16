import { AppLanguage, Cycle, Habit } from "../types";
import { CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { BarChart3 } from "./ui/icons";
import { t as tr } from "../i18n";
import { AppTab } from "../navigation";
import { addDays, getWeekIndexForDate, getWeekLabel, parseIso, toIsoDate, isHabitPlannedOnDate } from "../utils";
import { ProgressBar } from "./ProgressBar";
import { Icon } from "./ui/Icon";
import { resolveHabitIcon } from "./ui/habitIcons";
import { useStatsMetrics } from "../hooks/useStatsMetrics";
import {
    canToggleHabitCell,
    getExpandedHabitDateWindow,
    getGoalWeekChipClass,
    getHabitCellVisualState
} from "../regressionLogic";

interface StatsViewProps {
    cycle: Cycle;
    habits: Habit[];
    habitLog: Record<string, string[]>;
    onToggleHabitForDate: (date: string, habitId: string) => void;
    onDeleteHabit: (habitId: string) => void;
    readOnly: boolean;
    language: AppLanguage;
    setSelectedWeek: (week: number) => void;
    setActiveTab: (tab: AppTab) => void;
    onOpenHabitsManager: () => void;
    onOpenCycleDrawer: () => void;
}

function formatActualTargetLabel(done: number, target: number, unit: string) {
    return unit ? `${done} / ${target} ${unit}` : `${done} / ${target}`;
}

export function StatsView({
    cycle,
    habits,
    habitLog,
    onToggleHabitForDate,
    onDeleteHabit,
    readOnly,
    language,
    setSelectedWeek,
    setActiveTab,
    onOpenHabitsManager,
    onOpenCycleDrawer
}: StatsViewProps) {
    const [openHabits, setOpenHabits] = useState<Record<string, boolean>>({});
    const [habitEditMode, setHabitEditMode] = useState(false);
    const [armedDeleteHabitId, setArmedDeleteHabitId] = useState<string | null>(null);
    const [highlightedCellKey, setHighlightedCellKey] = useState<string | null>(null);
    const highlightTimeoutRef = useRef<number | null>(null);

    const today = toIsoDate(new Date());
    const todayWeekIndex = getWeekIndexForDate(cycle, today);
    const hasWeeklyTargets = cycle.weeks.some((week) => (cycle.weeklyTargets[week.index] ?? []).length > 0);
    const hasComparisonData = todayWeekIndex > 1
        && (((cycle.weeklyTargets[todayWeekIndex] ?? []).length > 0) || ((cycle.weeklyTargets[todayWeekIndex - 1] ?? []).length > 0));

    const {
        getWeekPercent,
        cyclePercentValue,
        cyclePercent,
        currentPercent,
        diff,
        goalTracking
    } = useStatsMetrics({ cycle, selectedWeek: todayWeekIndex });

    const progressStatusKey = useMemo(() => {
        if (cyclePercentValue < 40) return "stats.progressStatusLow";
        if (cyclePercentValue <= 70) return "stats.progressStatusMid";
        return "stats.progressStatusHigh";
    }, [cyclePercentValue]);

    useEffect(() => {
        return () => {
            if (highlightTimeoutRef.current !== null) {
                window.clearTimeout(highlightTimeoutRef.current);
            }
        };
    }, []);

    return (
        <section className="card stats-card">
            <h2 className="section-title-with-icon">
                <Icon icon={BarChart3} />
                {tr(language, "common.stats")}
            </h2>
            {readOnly && <p className="readonly-note">{tr(language, "app.archiveReadOnlyMode")}</p>}

            <div className="subcard">
                <h3>{tr(language, "stats.weeklyProgress")}</h3>
                {!hasWeeklyTargets && (
                    <div className="stats-empty-state">
                        <p className="empty">{tr(language, "stats.noWeeklyTargetsEmptyState")}</p>
                        <button
                            type="button"
                            onClick={() => {
                                setActiveTab("week");
                            }}
                        >
                            {tr(language, "stats.goToWeek")}
                        </button>
                    </div>
                )}
                {hasWeeklyTargets && (
                    <div className="stats-chart">
                        {cycle.weeks.map((week) => {
                            const percent = getWeekPercent(week.index);
                            const isCurrent = week.index === todayWeekIndex;
                            const isFuture = week.index > todayWeekIndex;

                            return (
                                <button
                                    key={week.index}
                                    type="button"
                                    disabled={isFuture}
                                    className={`stats-bar-container ${isCurrent ? "current" : ""} ${isFuture ? "future" : ""}`}
                                    title={isFuture
                                        ? tr(language, "stats.weekFutureTooltip", { week: week.index })
                                        : tr(language, "stats.weekTooltip", { week: week.index, percent })}
                                    onClick={() => {
                                        if (isFuture) return;
                                        setSelectedWeek(week.index);
                                        setActiveTab("week");
                                    }}
                                >
                                    <div className="stats-bar-label">W{week.index}</div>
                                    <div className={`stats-bar ${isFuture ? "future" : ""}`}>
                                        {!isFuture && (
                                            <div
                                                className="stats-bar-fill"
                                                style={{ "--bar-progress": `${percent}%` } as CSSProperties}
                                            />
                                        )}
                                    </div>
                                    <div className={`stats-bar-value ${isFuture ? "placeholder" : ""}`}>{isFuture ? "" : `${percent}%`}</div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="subcard stats-summary">
                <h3>{tr(language, "stats.totalProgress")}</h3>
                <div className="stats-big-number">{cyclePercent}</div>
                <p className="muted">{tr(language, "stats.totalProgressContext")}</p>
                {hasWeeklyTargets && (
                    <p className="stats-progress-status">{tr(language, progressStatusKey)}</p>
                )}
            </div>

            <div className="subcard stats-summary stats-goals-focus">
                <div className="stats-goals-header">
                    <h3>{tr(language, "stats.goals")}</h3>
                    <div className="stats-goals-header-actions">
                        <span className="stats-goals-count">{cycle.goals.length}</span>
                        <button type="button" onClick={onOpenCycleDrawer}>{tr(language, "stats.editGoals")}</button>
                    </div>
                </div>
                <p className="muted">{tr(language, "stats.goalsSubtitle")}</p>
                <div className="stats-goal-list">
                    {cycle.goals.length === 0 && (
                        <div className="stats-empty-state">
                            <p className="empty">{tr(language, "stats.noGoalsEmptyState")}</p>
                            <button type="button" onClick={onOpenCycleDrawer}>{tr(language, "stats.addGoals")}</button>
                        </div>
                    )}
                    {cycle.goals.map((goal, index) => (
                        <div key={goal.id} className="stats-goal-card">
                            <div className="stats-goal-index" aria-hidden="true">
                                {index + 1}
                            </div>
                            <div className="stats-goal-content">
                                <strong className="stats-goal-title">{goal.title}</strong>
                                {goal.metric && (
                                    <div className="stats-goal-metric">{goal.metric}</div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {hasWeeklyTargets && goalTracking.length > 0 && (
                <div className="subcard">
                    <h3>{tr(language, "stats.goalProgressPerTarget")}</h3>
                    <div className="goal-tracking-list">
                        {goalTracking.map((goal) => {
                            return (
                                <div key={goal.title} className="goal-tracking-item">
                                    <div className="goal-tracking-header">
                                        <div className="goal-tracking-info">
                                            <strong>{goal.title}</strong>
                                            <span className="goal-tracking-actual">
                                                {formatActualTargetLabel(goal.totalDone, goal.totalTarget, goal.unit)}
                                            </span>
                                            <span className="muted">
                                                {goal.activeWeeks} {goal.activeWeeks === 1 ? tr(language, "stats.weekSingle") : tr(language, "stats.weekPlural")}
                                            </span>
                                        </div>
                                        <span className={`goal-tracking-badge ${goal.percent >= 80 ? "high" : goal.percent >= 50 ? "mid" : "low"}`}>
                                            {goal.percent}%
                                        </span>
                                    </div>
                                    <ProgressBar value={goal.totalDone} max={goal.totalTarget} showLabel={false} />
                                    <div className="goal-week-grid">
                                        {cycle.weeks.map((week) => {
                                            const weekData = goal.weeks.find((w) => w.weekIndex === week.index);
                                            if (!weekData) {
                                                return (
                                                    <div key={week.index} className="goal-week-chip empty" title={tr(language, "stats.weekNotPlanned", { week: week.index })}>
                                                        {week.index}
                                                    </div>
                                                );
                                            }
                                            const wp = weekData.target > 0 ? Math.round((weekData.done / weekData.target) * 100) : 0;
                                            const chipClass = getGoalWeekChipClass(weekData);
                                            return (
                                                <div
                                                    key={week.index}
                                                    className={`goal-week-chip ${chipClass}`}
                                                    title={tr(language, "stats.goalWeekTooltip", {
                                                        week: week.index,
                                                        done: weekData.done,
                                                        target: weekData.target,
                                                        unit: goal.unit || "",
                                                        percent: wp
                                                    }).trim()}
                                                >
                                                    {week.index}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="subcard">
                <div className="habit-tracker-topbar">
                    <h3>{tr(language, "stats.habitTracker")}</h3>
                    <div className="habit-tracker-topbar-right">
                        <span className="habit-mini-label">{tr(language, "stats.last7Days")}</span>
                        {!readOnly && (
                            <button
                                type="button"
                                className="habit-tracker-mode-btn"
                                onClick={onOpenHabitsManager}
                            >
                                {tr(language, "common.manage")}
                            </button>
                        )}
                        {!readOnly && habits.length > 0 && (
                            <button
                                type="button"
                                className={`habit-tracker-mode-btn ${habitEditMode ? "active" : ""}`}
                                onClick={() => {
                                    setHabitEditMode((prev) => {
                                        const next = !prev;
                                        if (!next) setArmedDeleteHabitId(null);
                                        return next;
                                    });
                                }}
                            >
                                {habitEditMode ? tr(language, "common.done") : tr(language, "stats.editHabits")}
                            </button>
                        )}
                    </div>
                </div>

                {habits.length === 0 && (
                    <div className="stats-empty-state">
                        <p className="empty">{tr(language, "stats.noHabitsEmptyState")}</p>
                        {!readOnly && (
                            <button type="button" onClick={onOpenHabitsManager}>{tr(language, "stats.manageHabits")}</button>
                        )}
                    </div>
                )}

                {habits.length > 0 && (
                    <>
                        {habitEditMode && !readOnly && (
                            <p className="habit-tracker-mode-hint">{tr(language, "stats.deleteModeHint")}</p>
                        )}
                        <div className="habit-tracker-section compact">
                            {habits.map((habit) => {
                                const isOpen = !!openHabits[habit.id];
                                const isDeleteArmed = armedDeleteHabitId === habit.id;
                                const rawStartDate = habit.startedAt || cycle.startDate;
                                const habitStartDate = rawStartDate >= "2000-01-01" ? rawStartDate : cycle.startDate;
                                const recentDates = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
                                const expandedWindow = getExpandedHabitDateWindow({
                                    today,
                                    habitStartDate,
                                    windowDays: 28
                                });
                                const heatmapDates = expandedWindow.dates;
                                const heatmapStartOffset = expandedWindow.startOffset;

                                const dayLabels = language === "de"
                                    ? ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"]
                                    : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

                                let streak = 0;
                                let d = today;
                                let safety = 0;
                                while (safety < 365) {
                                    safety++;
                                    if (d < habitStartDate) break;

                                    const isPlanned = isHabitPlannedOnDate(cycle, habit, d);

                                    if (!isPlanned) {
                                        d = addDays(d, -1);
                                        continue;
                                    }

                                    const done = (habitLog[d] ?? []).includes(habit.id);
                                    if (!done) {
                                        if (d === today) {
                                            d = addDays(d, -1);
                                            continue;
                                        }
                                        break;
                                    }
                                    streak += 1;
                                    d = addDays(d, -1);
                                }

                                let plannedDaysSoFar = 0;
                                let doneDaysSoFar = 0;
                                let cursor = habitStartDate;
                                const maxDays = 365 * 2;
                                let daysCount = 0;

                                while (cursor <= today && daysCount < maxDays) {
                                    const isPlanned = isHabitPlannedOnDate(cycle, habit, cursor);
                                    const isDone = (habitLog[cursor] ?? []).includes(habit.id);

                                    if (isPlanned) {
                                        plannedDaysSoFar++;
                                        if (isDone) doneDaysSoFar++;
                                    }
                                    cursor = addDays(cursor, 1);
                                    daysCount++;
                                }

                                let rateLabel = "";
                                let ratePercent = 0;

                                if (habit.goal?.type === "target") {
                                    const target = habit.goal.target;
                                    ratePercent = Math.min(100, Math.round((doneDaysSoFar / target) * 100));
                                    const unit = habit.goal.unit?.trim();
                                    rateLabel = unit ? `${doneDaysSoFar} / ${target} ${unit}` : `${doneDaysSoFar} / ${target}`;
                                } else {
                                    ratePercent = plannedDaysSoFar > 0 ? Math.round((doneDaysSoFar / plannedDaysSoFar) * 100) : 0;
                                    rateLabel = `${ratePercent}%`;
                                }

                                return (
                                    <div
                                        key={habit.id}
                                        className={`habit-tracker-item ${habitEditMode ? "edit-mode" : ""} ${isDeleteArmed ? "delete-armed" : ""}`}
                                    >
                                        <div className="habit-tracker-main">
                                            <button
                                                type="button"
                                                className={`habit-tracker-header habit-tracker-toggle ${habitEditMode ? "locked" : ""}`}
                                                onClick={() => {
                                                    if (habitEditMode) return;
                                                    setOpenHabits((prev) => ({ ...prev, [habit.id]: !prev[habit.id] }));
                                                }}
                                            >
                                                <div className="habit-tracker-info">
                                                    <span className="habit-tracker-emoji"><Icon icon={resolveHabitIcon(habit.emoji)} size={18} /></span>
                                                    <span className="habit-tracker-title">{habit.title}</span>
                                                </div>
                                                <div className="habit-tracker-meta">
                                                    <div className="habit-tracker-meta-grid">
                                                        {streak > 0 && (
                                                            <span className="habit-streak-badge">{streak} {streak === 1 ? tr(language, "stats.daySingular") : tr(language, "stats.dayPlural")}</span>
                                                        )}
                                                        <span className={`habit-success-rate ${ratePercent >= 80 ? "high" : ratePercent >= 50 ? "mid" : "low"} ${streak > 0 ? "" : "solo"}`}>
                                                            {rateLabel}
                                                        </span>
                                                    </div>
                                                    <span className={`habit-tracker-caret ${isOpen ? "open" : ""}`}>{isOpen ? "▾" : "▸"}</span>
                                                </div>
                                            </button>
                                            <div className="habit-tracker-side">
                                                <div className="habit-mini-grid" aria-label={tr(language, "stats.last7Days")}>
                                                    {recentDates.map((date) => {
                                                        const planned = isHabitPlannedOnDate(cycle, habit, date);
                                                        const done = (habitLog[date] ?? []).includes(habit.id);
                                                        const isToday = date === today;
                                                        const isTodayPending = isToday && planned && !done;
                                                        let miniClass = "habit-mini-cell";
                                                        if (done) miniClass += " done";
                                                        else if (planned) miniClass += " missed";
                                                        else miniClass += " inactive";
                                                        if (isToday) miniClass += " today";
                                                        if (isTodayPending) miniClass += " pending-today";

                                                        const label = done
                                                            ? tr(language, "stats.done")
                                                            : isTodayPending
                                                                ? tr(language, "today.pendingStatus")
                                                                : planned
                                                                    ? tr(language, "stats.missed")
                                                                    : tr(language, "stats.notPlannedDay");
                                                        return (
                                                            <span
                                                                key={`${habit.id}-mini-${date}`}
                                                                className={miniClass}
                                                                title={`${date}: ${label}`}
                                                            />
                                                        );
                                                    })}
                                                </div>
                                                {habitEditMode && !readOnly && (
                                                    <div className="habit-delete-controls">
                                                        {!isDeleteArmed && (
                                                            <button
                                                                type="button"
                                                                className="ghost-danger"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setArmedDeleteHabitId(habit.id);
                                                                }}
                                                            >
                                                                {tr(language, "stats.removeHabit")}
                                                            </button>
                                                        )}
                                                        {isDeleteArmed && (
                                                            <>
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setArmedDeleteHabitId(null);
                                                                    }}
                                                                >
                                                                    {tr(language, "stats.cancelRemove")}
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="danger"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        if (window.confirm(tr(language, "stats.deleteHabitConfirm", { title: habit.title }))) {
                                                                            onDeleteHabit(habit.id);
                                                                            setArmedDeleteHabitId(null);
                                                                        }
                                                                    }}
                                                                >
                                                                    {tr(language, "stats.confirmRemove")}
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        {!habitEditMode && (
                                            <button
                                                type="button"
                                                className="habit-tracker-expand-btn"
                                                onClick={() => setOpenHabits((prev) => ({ ...prev, [habit.id]: !prev[habit.id] }))}
                                            >
                                                {isOpen ? tr(language, "stats.hideDetails") : tr(language, "stats.showDetails")}
                                            </button>
                                        )}
                                        {isOpen && !habitEditMode && (
                                            <div className="habit-heatmap-panel">
                                                <div className="habit-heatmap-scroll">
                                                    <div className="habit-heatmap-panel-meta">
                                                        <span className="habit-heatmap-panel-title"><Icon icon={resolveHabitIcon(habit.emoji)} size={18} /> {habit.title}</span>
                                                        <span className="habit-heatmap-panel-range">{tr(language, "stats.last4Weeks")}</span>
                                                    </div>
                                                    <div className="habit-heatmap-dayrow">
                                                        {[tr(language, "stats.day1"), tr(language, "stats.day2"), tr(language, "stats.day3"), tr(language, "stats.day4"), tr(language, "stats.day5"), tr(language, "stats.day6"), tr(language, "stats.day7")].map((dayLabel) => (
                                                            <span key={dayLabel}>{dayLabel}</span>
                                                        ))}
                                                    </div>
                                                    <div className="habit-heatmap-wrap">
                                                        <div className="habit-heatmap">
                                                            {Array.from({ length: heatmapStartOffset }, (_, i) => (
                                                                <div
                                                                    key={`${habit.id}-offset-${i}`}
                                                                    className="habit-heatmap-cell spacer"
                                                                    aria-hidden="true"
                                                                />
                                                            ))}
                                                            {heatmapDates.map((date) => {
                                                                const isPlanned = isHabitPlannedOnDate(cycle, habit, date);
                                                                const isDone = (habitLog[date] ?? []).includes(habit.id);
                                                                const isToday = date === today;
                                                                const isTodayPending = isToday && isPlanned && !isDone;
                                                                const canToggle = canToggleHabitCell({
                                                                    readOnly,
                                                                    date,
                                                                    today,
                                                                    habitStartDate,
                                                                    isPlanned
                                                                });
                                                                const cellState = getHabitCellVisualState({
                                                                    isDone,
                                                                    isPlanned
                                                                });
                                                                const cellKey = `${habit.id}-${date}`;

                                                                let cellClass = "habit-heatmap-cell";
                                                                cellClass += ` ${cellState}`;
                                                                if (isToday) cellClass += " today";
                                                                if (isTodayPending) cellClass += " pending-today";
                                                                if (canToggle) cellClass += " clickable";
                                                                if (highlightedCellKey === cellKey) cellClass += " flash";

                                                                const statusLabel = !isPlanned
                                                                    ? tr(language, "stats.notPlannedDay")
                                                                    : isDone
                                                                        ? tr(language, "stats.done")
                                                                        : isTodayPending
                                                                            ? tr(language, "today.pendingStatus")
                                                                            : tr(language, "stats.missed");

                                                                return (
                                                                    <button
                                                                        type="button"
                                                                        key={`${habit.id}-${date}`}
                                                                        className={cellClass}
                                                                        title={`${date} ${dayLabels[parseIso(date).getDay()]}: ${statusLabel}`}
                                                                        onClick={() => {
                                                                            if (!canToggle) return;
                                                                            onToggleHabitForDate(date, habit.id);
                                                                            setHighlightedCellKey(cellKey);
                                                                            if (highlightTimeoutRef.current !== null) {
                                                                                window.clearTimeout(highlightTimeoutRef.current);
                                                                            }
                                                                            highlightTimeoutRef.current = window.setTimeout(() => {
                                                                                setHighlightedCellKey((prev) => (prev === cellKey ? null : prev));
                                                                            }, 180);
                                                                        }}
                                                                    />
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>

            {hasComparisonData && diff !== null && (
                <div className="subcard">
                    <h3>{tr(language, "stats.currentWeekComparison")}</h3>
                    <div className="stats-comparison">
                        <div className="stats-current">
                            <span className="stats-week-label">{getWeekLabel(cycle, todayWeekIndex, language)}</span>
                            <span className="stats-week-value">{currentPercent}%</span>
                        </div>
                        <div className={`stats-trend ${diff > 0 ? "up" : diff < 0 ? "down" : "neutral"}`}>
                            {tr(language, "stats.vsPreviousWeek", {
                                arrow: diff > 0 ? "↑" : diff < 0 ? "↓" : "→",
                                diff: Math.abs(diff),
                                week: todayWeekIndex - 1,
                                weekLabel: getWeekLabel(cycle, todayWeekIndex - 1, language)
                            })}
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
