import { CSSProperties, useMemo, useState } from "react";
import { Check, Pencil, Plus, Trash2, X } from "./ui/icons";
import { t as tr } from "../i18n";
import { AppTab } from "../navigation";
import { AppLanguage, Cycle, DateFormat, Habit, Id } from "../types";
import { formatRange, getWeekLabel, getWeekProgressPercent } from "../utils";
import { CycleArchiveSection } from "./cycle/CycleArchiveSection";
import { CycleFinalReviewFlow } from "./cycle/CycleFinalReviewFlow";
import { Icon } from "./ui/Icon";
import { resolveHabitIcon } from "./ui/habitIcons";
import {
    buildGoalAccentMap,
    DEFAULT_WEEKLY_TARGET_ACCENT,
    normalizeWeeklyTargetAccent,
    WEEKLY_TARGET_ACCENT_PALETTE
} from "../utils/weeklyTargetAccents";

type PlanTabProps = {
    cycle: Cycle;
    language: AppLanguage;
    dateFormat: DateFormat;
    isArchiveView: boolean;
    history: Cycle[];
    habits: Habit[];
    setSelectedWeek: (week: number) => void;
    setActiveTab: (tab: AppTab) => void;
    updateCycle: (updater: (prev: Cycle) => Cycle) => void;
    onOpenHabitsManager: () => void;
    onViewArchivedCycle: (id: Id) => void;
    onDeleteArchivedCycle: (id: Id) => void;
    onArchiveRestart: () => void;
};

type PlanGoalDraft = {
    title: string;
    metric: string;
    color: string;
};

function hasWeeklyReviewContent(review?: { good?: string; bad?: string; change?: string }): boolean {
    if (!review) return false;
    return Boolean(
        (review.good ?? "").trim()
        || (review.bad ?? "").trim()
        || (review.change ?? "").trim()
    );
}

export function PlanTab({
    cycle,
    language,
    dateFormat,
    isArchiveView,
    history,
    habits,
    setSelectedWeek,
    setActiveTab,
    updateCycle,
    onOpenHabitsManager,
    onViewArchivedCycle,
    onDeleteArchivedCycle,
    onArchiveRestart
}: PlanTabProps) {
    const [isVisionEditing, setIsVisionEditing] = useState(false);
    const [showGoalComposer, setShowGoalComposer] = useState(false);
    const [goalDraft, setGoalDraft] = useState<PlanGoalDraft>({
        title: "",
        metric: "",
        color: DEFAULT_WEEKLY_TARGET_ACCENT
    });
    const [editingGoalId, setEditingGoalId] = useState<Id | null>(null);
    const [goalEditDraft, setGoalEditDraft] = useState<PlanGoalDraft>({
        title: "",
        metric: "",
        color: DEFAULT_WEEKLY_TARGET_ACCENT
    });
    const activeHabits = useMemo(() => habits.slice(0, 8), [habits]);
    const goalAccentById = useMemo(() => buildGoalAccentMap(cycle.goals), [cycle.goals]);

    const openGoalComposer = () => {
        if (isArchiveView) return;
        setShowGoalComposer(true);
        setEditingGoalId(null);
        setGoalDraft({
            title: "",
            metric: "",
            color: WEEKLY_TARGET_ACCENT_PALETTE[cycle.goals.length % WEEKLY_TARGET_ACCENT_PALETTE.length]
        });
    };

    const addGoal = () => {
        if (isArchiveView) return;
        const nextTitle = goalDraft.title.trim();
        if (!nextTitle) return;
        const nextMetric = goalDraft.metric.trim() || undefined;
        const nextColor = normalizeWeeklyTargetAccent(goalDraft.color)
            ?? WEEKLY_TARGET_ACCENT_PALETTE[cycle.goals.length % WEEKLY_TARGET_ACCENT_PALETTE.length];

        updateCycle((prev) => ({
            ...prev,
            goals: [
                ...prev.goals,
                {
                    id: crypto.randomUUID(),
                    title: nextTitle,
                    metric: nextMetric,
                    color: nextColor
                }
            ]
        }));

        setShowGoalComposer(false);
        setGoalDraft({ title: "", metric: "", color: DEFAULT_WEEKLY_TARGET_ACCENT });
    };

    const startGoalEdit = (goalId: Id) => {
        const goalIndex = cycle.goals.findIndex((goal) => goal.id === goalId);
        const goal = cycle.goals[goalIndex];
        if (!goal) return;

        const fallbackAccent = WEEKLY_TARGET_ACCENT_PALETTE[Math.max(0, goalIndex) % WEEKLY_TARGET_ACCENT_PALETTE.length];
        setEditingGoalId(goalId);
        setShowGoalComposer(false);
        setGoalEditDraft({
            title: goal.title,
            metric: goal.metric ?? "",
            color: normalizeWeeklyTargetAccent(goal.color) ?? fallbackAccent
        });
    };

    const saveGoalEdit = () => {
        if (!editingGoalId || isArchiveView) return;
        const nextTitle = goalEditDraft.title.trim();
        if (!nextTitle) return;
        const nextMetric = goalEditDraft.metric.trim() || undefined;
        const nextColor = normalizeWeeklyTargetAccent(goalEditDraft.color) ?? DEFAULT_WEEKLY_TARGET_ACCENT;

        updateCycle((prev) => ({
            ...prev,
            goals: prev.goals.map((goal) => goal.id === editingGoalId
                ? { ...goal, title: nextTitle, metric: nextMetric, color: nextColor }
                : goal)
        }));
        setEditingGoalId(null);
    };

    const deleteGoal = (goalId: Id) => {
        if (isArchiveView) return;
        updateCycle((prev) => {
            const goalIndex = prev.goals.findIndex((goal) => goal.id === goalId);
            const fallbackAccent = WEEKLY_TARGET_ACCENT_PALETTE[
                (goalIndex >= 0 ? goalIndex : 0) % WEEKLY_TARGET_ACCENT_PALETTE.length
            ];

            const nextWeeklyTargets: Cycle["weeklyTargets"] = {};
            Object.entries(prev.weeklyTargets).forEach(([weekKey, targets]) => {
                const weekIndex = Number.parseInt(weekKey, 10);
                if (!Number.isInteger(weekIndex)) return;
                nextWeeklyTargets[weekIndex] = targets.map((target) => {
                    if (target.goalId !== goalId) return target;
                    return {
                        ...target,
                        goalId: undefined,
                        color: normalizeWeeklyTargetAccent(target.color) ?? fallbackAccent
                    };
                });
            });

            return {
                ...prev,
                goals: prev.goals.filter((goal) => goal.id !== goalId),
                weeklyTargets: nextWeeklyTargets
            };
        });

        setEditingGoalId((prev) => (prev === goalId ? null : prev));
    };

    return (
        <section className="card plan-tab-card">
            <div className="section-title">
                <h2>{tr(language, "plan.title")}</h2>
                <span className="muted">{formatRange(cycle.startDate, cycle.weeks[cycle.weeks.length - 1]?.endDate ?? cycle.startDate, dateFormat, language)}</span>
            </div>
            {isArchiveView && <p className="readonly-note">{tr(language, "app.archiveReadOnlyMode")}</p>}

            <div className="subcard plan-vision-card">
                <div className="plan-card-head">
                    <h3>{tr(language, "plan.visionTitle")}</h3>
                    {!isArchiveView && (
                        <button type="button" className="icon-btn" onClick={() => setIsVisionEditing((prev) => !prev)}>
                            <Icon icon={Pencil} size={14} />
                        </button>
                    )}
                </div>
                {isVisionEditing && !isArchiveView ? (
                    <label>
                        {tr(language, "cycle.visionLabel")}
                        <textarea
                            value={cycle.vision}
                            onChange={(event) => {
                                const nextVision = event.target.value;
                                updateCycle((prev) => ({ ...prev, vision: nextVision }));
                            }}
                        />
                    </label>
                ) : (
                    <p className="muted">{cycle.vision.trim() || tr(language, "plan.noVision")}</p>
                )}
            </div>

            <div className="subcard plan-goals-card">
                <div className="plan-card-head">
                    <h3>{tr(language, "plan.goalsTitle")}</h3>
                    {!isArchiveView && (
                        <button
                            type="button"
                            className="plan-goal-add-btn"
                            onClick={openGoalComposer}
                            title={tr(language, "plan.addGoal")}
                            aria-label={tr(language, "plan.addGoal")}
                        >
                            <Icon icon={Plus} size={16} />
                        </button>
                    )}
                </div>
                <p className="plan-goals-subtitle muted">{tr(language, "plan.goalsSubtitle")}</p>
                <p className="plan-goals-recommendation muted">{tr(language, "plan.goalsRecommendation")}</p>

                {showGoalComposer && !isArchiveView && (
                    <div className="plan-goal-editor">
                        <input
                            value={goalDraft.title}
                            onChange={(event) => setGoalDraft((prev) => ({ ...prev, title: event.target.value }))}
                            placeholder={tr(language, "onboarding.goal")}
                        />
                        <input
                            value={goalDraft.metric}
                            onChange={(event) => setGoalDraft((prev) => ({ ...prev, metric: event.target.value }))}
                            placeholder={tr(language, "onboarding.metricOptional")}
                        />
                        <div className="plan-goal-color-row">
                            <span className="week-target-color-picker-label">{tr(language, "plan.goalColor")}</span>
                            <div className="week-target-color-grid" role="radiogroup" aria-label={tr(language, "plan.goalColor")}>
                                {WEEKLY_TARGET_ACCENT_PALETTE.map((color, colorIndex) => {
                                    const selectedColor = normalizeWeeklyTargetAccent(goalDraft.color) ?? DEFAULT_WEEKLY_TARGET_ACCENT;
                                    const isSelected = selectedColor === color;
                                    return (
                                        <button
                                            key={`plan-draft-${color}`}
                                            type="button"
                                            role="radio"
                                            aria-checked={isSelected}
                                            className={`week-target-color-swatch ${isSelected ? "selected" : ""}`}
                                            style={{ "--week-target-accent": color } as CSSProperties}
                                            onClick={() => setGoalDraft((prev) => ({ ...prev, color }))}
                                            title={`${tr(language, "plan.goalColor")} ${colorIndex + 1}`}
                                        >
                                            {isSelected && <Icon icon={Check} size={13} />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="button-row">
                            <button
                                type="button"
                                className="primary"
                                onClick={addGoal}
                                disabled={!goalDraft.title.trim()}
                            >
                                {tr(language, "common.add")}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowGoalComposer(false);
                                    setGoalDraft({ title: "", metric: "", color: DEFAULT_WEEKLY_TARGET_ACCENT });
                                }}
                            >
                                {tr(language, "common.cancel")}
                            </button>
                        </div>
                    </div>
                )}
                {cycle.goals.length === 0 ? (
                    <p className="empty">{tr(language, "stats.noGoalsEmptyState")}</p>
                ) : (
                    <div className="plan-goals-grid">
                        {cycle.goals.map((goal) => (
                            <article
                                key={goal.id}
                                className="plan-goal-chip has-goal-accent"
                                style={{ "--goal-accent": goalAccentById.get(String(goal.id)) } as CSSProperties}
                            >
                                {editingGoalId === goal.id && !isArchiveView ? (
                                    <>
                                        <input
                                            value={goalEditDraft.title}
                                            onChange={(event) => setGoalEditDraft((prev) => ({ ...prev, title: event.target.value }))}
                                            placeholder={tr(language, "onboarding.goal")}
                                        />
                                        <input
                                            value={goalEditDraft.metric}
                                            onChange={(event) => setGoalEditDraft((prev) => ({ ...prev, metric: event.target.value }))}
                                            placeholder={tr(language, "onboarding.metricOptional")}
                                        />
                                        <div className="plan-goal-color-row">
                                            <span className="week-target-color-picker-label">{tr(language, "plan.goalColor")}</span>
                                            <div className="week-target-color-grid" role="radiogroup" aria-label={tr(language, "plan.goalColor")}>
                                                {WEEKLY_TARGET_ACCENT_PALETTE.map((color, colorIndex) => {
                                                    const selectedColor = normalizeWeeklyTargetAccent(goalEditDraft.color) ?? DEFAULT_WEEKLY_TARGET_ACCENT;
                                                    const isSelected = selectedColor === color;
                                                    return (
                                                        <button
                                                            key={`plan-edit-${goal.id}-${color}`}
                                                            type="button"
                                                            role="radio"
                                                            aria-checked={isSelected}
                                                            className={`week-target-color-swatch ${isSelected ? "selected" : ""}`}
                                                            style={{ "--week-target-accent": color } as CSSProperties}
                                                            onClick={() => setGoalEditDraft((prev) => ({ ...prev, color }))}
                                                            title={`${tr(language, "plan.goalColor")} ${colorIndex + 1}`}
                                                        >
                                                            {isSelected && <Icon icon={Check} size={13} />}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                        <div className="plan-goal-actions">
                                            <button
                                                type="button"
                                                className="icon-btn"
                                                onClick={saveGoalEdit}
                                                title={tr(language, "common.save")}
                                                aria-label={tr(language, "common.save")}
                                                disabled={!goalEditDraft.title.trim()}
                                            >
                                                <Icon icon={Check} size={15} />
                                            </button>
                                            <button
                                                type="button"
                                                className="icon-btn"
                                                onClick={() => setEditingGoalId(null)}
                                                title={tr(language, "common.cancel")}
                                                aria-label={tr(language, "common.cancel")}
                                            >
                                                <Icon icon={X} size={15} />
                                            </button>
                                            <button
                                                type="button"
                                                className="icon-btn ghost-danger"
                                                onClick={() => deleteGoal(goal.id)}
                                                title={tr(language, "common.delete")}
                                                aria-label={tr(language, "common.delete")}
                                            >
                                                <Icon icon={Trash2} size={15} />
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <strong>{goal.title}</strong>
                                        {goal.metric && <span>{goal.metric}</span>}
                                        {!isArchiveView && (
                                            <div className="plan-goal-actions">
                                                <button
                                                    type="button"
                                                    className="icon-btn"
                                                    onClick={() => startGoalEdit(goal.id)}
                                                    title={tr(language, "common.edit")}
                                                    aria-label={tr(language, "common.edit")}
                                                >
                                                    <Icon icon={Pencil} size={14} />
                                                </button>
                                                <button
                                                    type="button"
                                                    className="icon-btn ghost-danger"
                                                    onClick={() => deleteGoal(goal.id)}
                                                    title={tr(language, "common.delete")}
                                                    aria-label={tr(language, "common.delete")}
                                                >
                                                    <Icon icon={Trash2} size={14} />
                                                </button>
                                            </div>
                                        )}
                                    </>
                                )}
                            </article>
                        ))}
                    </div>
                )}
            </div>

            <div className="subcard plan-roadmap-card">
                <div className="plan-card-head">
                    <h3>{tr(language, "plan.roadmapTitle")}</h3>
                </div>
                <div className="plan-roadmap-list">
                    {cycle.weeks.map((week) => {
                        const percent = getWeekProgressPercent(cycle, week.index);
                        const reviewDone = hasWeeklyReviewContent(cycle.weeklyReviews[week.index]);
                        return (
                            <button
                                key={week.index}
                                type="button"
                                className="plan-roadmap-row"
                                onClick={() => {
                                    setSelectedWeek(week.index);
                                    setActiveTab("week");
                                }}
                            >
                                <div className="plan-roadmap-main">
                                    <strong>{getWeekLabel(cycle, week.index, language)}</strong>
                                    <span>{formatRange(week.startDate, week.endDate, dateFormat, language)}</span>
                                    {week.weekName && <em>{week.weekName}</em>}
                                </div>
                                <div className="plan-roadmap-meta">
                                    <span className="plan-roadmap-percent">{percent}%</span>
                                    <span className={`plan-roadmap-review ${reviewDone ? "done" : ""}`}>
                                        {reviewDone ? tr(language, "plan.reviewDone") : tr(language, "plan.reviewOpen")}
                                    </span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="subcard">
                <div className="plan-card-head">
                    <h3>{tr(language, "plan.habitsTitle")}</h3>
                    <button type="button" onClick={onOpenHabitsManager}>{tr(language, "common.manage")}</button>
                </div>
                {activeHabits.length === 0 ? (
                    <p className="empty">{tr(language, "stats.noHabitsEmptyState")}</p>
                ) : (
                    <div className="plan-habits-list">
                        {activeHabits.map((habit) => (
                            <span key={habit.id} className="week-chip plan-habit-chip">
                                <Icon icon={resolveHabitIcon(habit.emoji)} size={16} className="plan-habit-chip-icon" />
                                <span className="plan-habit-chip-label">{habit.title}</span>
                            </span>
                        ))}
                    </div>
                )}
            </div>

            <div className="subcard">
                <CycleFinalReviewFlow
                    cycle={cycle}
                    language={language}
                    readOnly={isArchiveView}
                    updateCycle={updateCycle}
                />
            </div>

            <div className="subcard">
                <CycleArchiveSection
                    language={language}
                    dateFormat={dateFormat}
                    history={history}
                    readOnly={isArchiveView}
                    onViewCycle={onViewArchivedCycle}
                    onDeleteCycle={onDeleteArchivedCycle}
                />
                <div className="button-row">
                    <button type="button" disabled={isArchiveView} onClick={onArchiveRestart}>
                        {tr(language, "settings.archiveRestart")}
                    </button>
                </div>
            </div>
        </section>
    );
}
