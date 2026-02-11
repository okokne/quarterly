import { AppLanguage, Cycle, Habit } from "../types";
import { useEffect, useRef, useState } from "react";
import { t as tr } from "../i18n";
import { addDays, parseIso, toIsoDate, isHabitPlannedOnDate } from "../utils";
import { ProgressBar } from "./ProgressBar";
import { useStatsMetrics } from "../hooks/useStatsMetrics";
import {
    canToggleHabitCell,
    getExpandedHabitDateWindow,
    getGoalWeekChipClass,
    getHabitCellVisualState
} from "../regressionLogic";

type Tab = "today" | "week" | "stats" | "journal";

interface StatsViewProps {
    cycle: Cycle;
    habits: Habit[];
    habitLog: Record<string, string[]>;
    onToggleHabitForDate: (date: string, habitId: string) => void;
    onDeleteHabit: (habitId: string) => void;
    readOnly: boolean;
    language: AppLanguage;
    selectedWeek: number;
    setSelectedWeek: (week: number) => void;
    setActiveTab: (tab: Tab) => void;
}

export function StatsView({
    cycle,
    habits,
    habitLog,
    onToggleHabitForDate,
    onDeleteHabit,
    readOnly,
    language,
    selectedWeek,
    setSelectedWeek,
    setActiveTab
}: StatsViewProps) {
    const [openHabits, setOpenHabits] = useState<Record<string, boolean>>({});
    const [habitEditMode, setHabitEditMode] = useState(false);
    const [armedDeleteHabitId, setArmedDeleteHabitId] = useState<string | null>(null);
    const [highlightedCellKey, setHighlightedCellKey] = useState<string | null>(null);
    const highlightTimeoutRef = useRef<number | null>(null);
    const {
        getWeekPercent,
        cyclePercent,
        currentPercent,
        diff,
        goalTracking
    } = useStatsMetrics({ cycle, selectedWeek });

    useEffect(() => {
        return () => {
            if (highlightTimeoutRef.current !== null) {
                window.clearTimeout(highlightTimeoutRef.current);
            }
        };
    }, []);

    return (
        <section className="card">
            <h2>📊 {tr(language, "common.stats")}</h2>
            {readOnly && <p className="readonly-note">{tr(language, "app.archiveReadOnlyMode")}</p>}

            {/* ═══ Weekly Progress Bar Chart ═══ */}
            <div className="subcard">
                <h3>{tr(language, "stats.weeklyProgress")}</h3>
                <div className="stats-chart">
                    {cycle.weeks.map((week) => {
                        const percent = getWeekPercent(week.index);
                        const isCurrent = week.index === selectedWeek;

                        return (
                            <div
                                key={week.index}
                                className={`stats-bar-container ${isCurrent ? 'current' : ''}`}
                                onClick={() => { setSelectedWeek(week.index); setActiveTab("week"); }}
                            >
                                <div className="stats-bar-label">W{week.index}</div>
                                <div className="stats-bar">
                                    <div
                                        className="stats-bar-fill"
                                        style={{ height: `${percent}%` }}
                                    />
                                </div>
                                <div className="stats-bar-value">{percent}%</div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ═══ Gesamtfortschritt ═══ */}
            <div className="subcard stats-summary">
                <h3>{tr(language, "stats.totalProgress")}</h3>
                <div className="stats-big-number">{cyclePercent}</div>
                <p className="muted">{tr(language, "stats.overAllWeeks")}</p>
            </div>

            {/* ═══ Goal Tracking ═══ */}
            {goalTracking.length > 0 && (
                <div className="subcard">
                    <h3>{tr(language, "stats.goalProgressPerTarget")}</h3>
                    <div className="goal-tracking-list">
                        {goalTracking.map((goal) => {
                            return (
                                <div key={goal.title} className="goal-tracking-item">
                                    <div className="goal-tracking-header">
                                        <div className="goal-tracking-info">
                                            <strong>{goal.title}</strong>
                                            <span className="muted">
                                                {goal.totalDone}/{goal.totalTarget} {goal.unit} · {goal.activeWeeks} {goal.activeWeeks === 1 ? tr(language, "stats.weekSingle") : tr(language, "stats.weekPlural")}
                                            </span>
                                        </div>
                                        <span className={`goal-tracking-badge ${goal.percent >= 80 ? 'high' : goal.percent >= 50 ? 'mid' : 'low'}`}>
                                            {goal.percent}%
                                        </span>
                                    </div>
                                    <ProgressBar value={goal.totalDone} max={goal.totalTarget} showLabel={false} />
                                    <div className="goal-week-grid">
                                        {cycle.weeks.map((week) => {
                                            const weekData = goal.weeks.find(w => w.weekIndex === week.index);
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
                                                    title={`W${week.index}: ${weekData.done}/${weekData.target} ${goal.unit} (${wp}%)`}
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

            {/* ═══ Habit Tracker Heatmap ═══ */}
            {habits.length > 0 && (
                <div className="subcard">
                    <div className="habit-tracker-topbar">
                        <h3>{tr(language, "stats.habitTracker")}</h3>
                        <div className="habit-tracker-topbar-right">
                            <span className="habit-mini-label">{tr(language, "stats.last7Days")}</span>
                            {!readOnly && (
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
                    {habitEditMode && !readOnly && (
                        <p className="habit-tracker-mode-hint">{tr(language, "stats.deleteModeHint")}</p>
                    )}
                    <div className="habit-tracker-section compact">
                        {habits.map((habit) => {
                            const today = toIsoDate(new Date());
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
                                ? ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
                                : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

                            // Calculate streak (consecutive days ending today)
                            let streak = 0;
                            let d = today;
                            // Safety break after 365 days to prevent infinite loops if logic fails
                            let safety = 0;
                            while (safety < 365) {
                                safety++;
                                if (d < habitStartDate) break;

                                // Check if planned (simple frequency check)
                                // We use a local helper or the modified util. 
                                // Since activeFrom/To are cycle dependent, we might ignore them for now or assume they apply if cycle is relevant.
                                // For true independence, we rely on frequency.
                                const isPlanned = isHabitPlannedOnDate(cycle, habit, d);

                                if (!isPlanned) {
                                    d = addDays(d, -1);
                                    continue;
                                }

                                const done = (habitLog[d] ?? []).includes(habit.id);
                                if (!done) {
                                    // If it's today and not done, streak might still be valid from yesterday
                                    if (d === today) {
                                        d = addDays(d, -1);
                                        continue;
                                    }
                                    break;
                                }
                                streak += 1;
                                d = addDays(d, -1);
                            }

                            // Calculate stats based on "Start Date -> Today"
                            let plannedDaysSoFar = 0;
                            let doneDaysSoFar = 0;

                            // Iterate from habit start to today.
                            let cursor = habitStartDate;

                            const maxDays = 365 * 2; // Cap calculation at 2 years
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

                            if (habit.goal?.type === 'target') {
                                // Fixed Target: Progress based on Total Done vs Target
                                const target = habit.goal.target;
                                ratePercent = Math.min(100, Math.round((doneDaysSoFar / target) * 100)); // Use doneDaysSoFar (total done since start)
                                const unit = habit.goal.unit?.trim();
                                rateLabel = unit ? `${doneDaysSoFar} / ${target} ${unit}` : `${doneDaysSoFar} / ${target}`;
                            } else {
                                // Open Ended: Consistency based on Planned Days So Far
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
                                                <span className="habit-tracker-emoji">{habit.emoji}</span>
                                                <span className="habit-tracker-title">{habit.title}</span>
                                            </div>
                                            <div className="habit-tracker-meta">
                                                {streak > 0 && (
                                                    <span className="habit-streak-badge">{streak} {streak === 1 ? tr(language, "stats.daySingular") : tr(language, "stats.dayPlural")}</span>
                                                )}
                                                <span className={`habit-success-rate ${ratePercent >= 80 ? 'high' : ratePercent >= 50 ? 'mid' : 'low'}`}>
                                                    {rateLabel}
                                                </span>
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
                                            <div className="habit-heatmap-panel-meta">{tr(language, "stats.last4Weeks")}</div>
                                            <div className="habit-heatmap-scroll">
                                                <div className="habit-heatmap-dayrow">
                                                    {[tr(language, "stats.day1"), tr(language, "stats.day2"), tr(language, "stats.day3"), tr(language, "stats.day4"), tr(language, "stats.day5"), tr(language, "stats.day6"), tr(language, "stats.day7")].map((d) => (
                                                        <span key={d}>{d}</span>
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

                                                            let cellClass = 'habit-heatmap-cell';
                                                            cellClass += ` ${cellState}`;
                                                            if (isToday) cellClass += ' today';
                                                            if (isTodayPending) cellClass += ' pending-today';
                                                            if (canToggle) cellClass += ' clickable';
                                                            if (highlightedCellKey === cellKey) cellClass += ' flash';

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
                </div>
            )}

            <div className="subcard">
                <h3>{tr(language, "stats.currentWeekComparison")}</h3>
                <div className="stats-comparison">
                    <div className="stats-current">
                        <span className="stats-week-label">{tr(language, "app.headerWeekShort", { week: selectedWeek })}</span>
                        <span className="stats-week-value">{currentPercent}%</span>
                    </div>
                    {diff !== null && (
                        <div className={`stats-trend ${diff >= 0 ? 'up' : 'down'}`}>
                            {tr(language, "stats.vsPreviousWeek", { arrow: diff >= 0 ? "↑" : "↓", diff: Math.abs(diff), week: selectedWeek - 1 })}
                        </div>
                    )}
                    {diff === null && (
                        <div className="stats-trend neutral">{tr(language, "stats.firstWeekNoComparison")}</div>
                    )}
                </div>
            </div>

            {/* ═══ Goals List ═══ */}
            <div className="subcard stats-summary stats-goals-focus">
                <div className="stats-goals-header">
                    <h3>{tr(language, "stats.goals")}</h3>
                    <span className="stats-goals-count">{cycle.goals.length}</span>
                </div>
                <div className="stats-goal-list">
                    {cycle.goals.length === 0 && <p className="empty">{tr(language, "stats.noGoals")}</p>}
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
        </section>
    );
}
