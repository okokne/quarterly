import { DragEvent, useMemo, useRef, useState } from "react";
import { Pencil, X } from "lucide-react";
import { AppLanguage, Cycle, DateFormat, Habit, Id } from "../types";
import { t as tr } from "../i18n";
import { CycleVisionSection } from "./cycle/CycleVisionSection";
import { CycleArchiveSection } from "./cycle/CycleArchiveSection";
import { ProgressRing } from "./ProgressRing";
import { addDays, formatDate, getWeekIndexForDate, toIsoDate, uid } from "../utils";
import { Icon } from "./ui/Icon";
import { resolveHabitIcon } from "./ui/habitIcons";

type CycleDrawerProps = {
    open: boolean;
    language: AppLanguage;
    dateFormat: DateFormat;
    cycle: Cycle | null;
    habits: Habit[];
    history: Cycle[];
    readOnly: boolean;
    onOpenHabitsManager: () => void;
    updateCycle: (updater: (prev: Cycle) => Cycle) => void;
    onArchiveRestart: () => void;
    startInQuarterReview?: boolean;
    onViewArchivedCycle: (id: Id) => void;
    onDeleteArchivedCycle: (id: Id) => void;
    onClose: () => void;
};

export function CycleDrawer({
    open,
    language,
    dateFormat,
    cycle,
    habits,
    history,
    readOnly,
    onOpenHabitsManager,
    updateCycle,
    onArchiveRestart,
    startInQuarterReview = false,
    onViewArchivedCycle,
    onDeleteArchivedCycle,
    onClose
}: CycleDrawerProps) {
    if (!open || !cycle) return null;

    const totalWeeks = cycle.weeks.length || 12;
    const todayIso = toIsoDate(new Date());
    const currentWeek = getWeekIndexForDate(cycle, todayIso);
    const remainingWeeks = Math.max(totalWeeks - currentWeek, 0);
    const quarterEndDate = addDays(cycle.startDate, 83);
    const isQuarterComplete = todayIso >= quarterEndDate;

    const hasQuarterReview = Boolean(
        cycle.finalReview
        && (
            (cycle.finalReview.breakthroughs ?? "").trim()
            || (cycle.finalReview.keyLearning ?? "").trim()
            || (cycle.finalReview.lifeQuality ?? "").trim()
            || (cycle.finalReview.nextCycle ?? "").trim()
        )
    );
    const [showQuarterReviewForm, setShowQuarterReviewForm] = useState(startInQuarterReview || hasQuarterReview);
    const [goalTitleDraft, setGoalTitleDraft] = useState("");
    const [goalMetricDraft, setGoalMetricDraft] = useState("");
    const [editingGoalId, setEditingGoalId] = useState<Id | null>(null);
    const [goalEditTitle, setGoalEditTitle] = useState("");
    const [goalEditMetric, setGoalEditMetric] = useState("");
    const [draggingGoalId, setDraggingGoalId] = useState<Id | null>(null);
    const [isVisionEditing, setIsVisionEditing] = useState(false);
    const archiveAnchorRef = useRef<HTMLDivElement | null>(null);

    const activeHabits = useMemo(() => habits.filter((habit) => {
        const started = habit.startedAt || habit.createdAt || cycle.startDate;
        return started <= todayIso;
    }), [cycle.startDate, habits, todayIso]);

    const addGoal = () => {
        if (readOnly) return;
        if (!goalTitleDraft.trim()) return;
        updateCycle((prev) => ({
            ...prev,
            goals: [...prev.goals, {
                id: uid(),
                title: goalTitleDraft.trim(),
                metric: goalMetricDraft.trim() || undefined
            }]
        }));
        setGoalTitleDraft("");
        setGoalMetricDraft("");
    };

    const startGoalEdit = (goalId: Id, title: string, metric?: string) => {
        setEditingGoalId(goalId);
        setGoalEditTitle(title);
        setGoalEditMetric(metric ?? "");
    };

    const saveGoalEdit = () => {
        if (readOnly || !editingGoalId || !goalEditTitle.trim()) return;
        updateCycle((prev) => ({
            ...prev,
            goals: prev.goals.map((goal) => goal.id === editingGoalId
                ? { ...goal, title: goalEditTitle.trim(), metric: goalEditMetric.trim() || undefined }
                : goal)
        }));
        setEditingGoalId(null);
    };

    const deleteGoal = (goalId: Id) => {
        if (readOnly) return;
        updateCycle((prev) => ({
            ...prev,
            goals: prev.goals.filter((goal) => goal.id !== goalId)
        }));
        if (editingGoalId === goalId) {
            setEditingGoalId(null);
        }
    };

    const moveGoal = (fromIndex: number, toIndex: number) => {
        if (readOnly || fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return;
        updateCycle((prev) => {
            const goals = [...prev.goals];
            const [moved] = goals.splice(fromIndex, 1);
            if (!moved) return prev;
            goals.splice(toIndex, 0, moved);
            return { ...prev, goals };
        });
    };

    const handleGoalDrop = (targetIndex: number) => {
        if (!draggingGoalId) return;
        const fromIndex = cycle.goals.findIndex((goal) => goal.id === draggingGoalId);
        moveGoal(fromIndex, targetIndex);
        setDraggingGoalId(null);
    };

    const allowGoalDrop = (event: DragEvent<HTMLDivElement>) => {
        if (readOnly) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
    };

    const finalReview = cycle.finalReview ?? {
        breakthroughs: "",
        keyLearning: "",
        lifeQuality: "",
        nextCycle: ""
    };

    return (
        <div className="overlay-backdrop" onClick={onClose}>
            <aside className="overlay-card cycle-drawer" onClick={(event) => event.stopPropagation()}>
                <div className="overlay-header">
                    <h3>{tr(language, "cycle.drawerTitle")}</h3>
                    <button className="icon-btn" onClick={onClose} aria-label={tr(language, "common.close")}>
                        <Icon icon={X} />
                    </button>
                </div>

                <section className="cycle-section cycle-status-section">
                    <div className="cycle-status-header">
                        <h3>{tr(language, "cycle.statusTitle")}</h3>
                        <span className="muted">{tr(language, "cycle.weekLabel", { week: currentWeek, total: totalWeeks })}</span>
                    </div>
                    <div className="cycle-status-main">
                        <div className="cycle-status-ring" aria-label={tr(language, "cycle.remainingWeeks", { count: remainingWeeks })}>
                            <ProgressRing value={currentWeek} max={totalWeeks} size={124} strokeWidth={9} />
                            <div className="cycle-status-ring-center">
                                <span className="cycle-status-ring-value">{remainingWeeks}</span>
                                <span className="cycle-status-ring-label">{tr(language, "cycle.remainingWeeksShort")}</span>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="cycle-section cycle-goals-section stats-goals-focus">
                    <div className="cycle-status-header">
                        <h3>{tr(language, "cycle.goalsTitle")}</h3>
                        <span className="muted">{tr(language, "cycle.goalsHint")}</span>
                    </div>
                    {cycle.goals.length === 0 && <p className="muted">{tr(language, "week.noGoals")}</p>}
                    <div className="stats-goal-list cycle-goal-list">
                        {cycle.goals.map((goal, index) => {
                            const isEditing = editingGoalId === goal.id;
                            return (
                                <div
                                    key={goal.id}
                                    className={`stats-goal-card cycle-goal-card ${draggingGoalId === goal.id ? "dragging" : ""}`}
                                    draggable={!readOnly && !isEditing}
                                    onDragStart={(event) => {
                                        if (readOnly || isEditing) {
                                            event.preventDefault();
                                            return;
                                        }
                                        setDraggingGoalId(goal.id);
                                        event.dataTransfer.effectAllowed = "move";
                                    }}
                                    onDragOver={allowGoalDrop}
                                    onDrop={() => handleGoalDrop(index)}
                                    onDragEnd={() => setDraggingGoalId(null)}
                                >
                                    <div className="stats-goal-index" aria-hidden="true">
                                        {index + 1}
                                    </div>
                                    <div className="stats-goal-content">
                                        {isEditing ? (
                                            <div className="cycle-goal-edit">
                                                <input value={goalEditTitle} onChange={(event) => setGoalEditTitle(event.target.value)} />
                                                <input value={goalEditMetric} onChange={(event) => setGoalEditMetric(event.target.value)} placeholder={tr(language, "onboarding.metricOptional")} />
                                            </div>
                                        ) : (
                                            <>
                                                <strong className="stats-goal-title">{goal.title}</strong>
                                                {goal.metric && <div className="stats-goal-metric">{goal.metric}</div>}
                                            </>
                                        )}
                                    </div>
                                    <div className="cycle-goal-actions">
                                        {isEditing ? (
                                            <>
                                                <button className="button" onClick={saveGoalEdit} disabled={readOnly || !goalEditTitle.trim()}>{tr(language, "common.save")}</button>
                                                <button className="button" onClick={() => setEditingGoalId(null)}>{tr(language, "common.cancel")}</button>
                                            </>
                                        ) : (
                                            <>
                                                <button className="icon-btn cycle-goal-edit-btn" onClick={() => startGoalEdit(goal.id, goal.title, goal.metric)} title={tr(language, "common.edit")} aria-label={tr(language, "common.edit")}>
                                                    <Icon icon={Pencil} size={16} />
                                                </button>
                                                <span className="drag-handle cycle-goal-drag-handle" aria-label={tr(language, "common.reorder")} title={tr(language, "common.reorder")}>⋮⋮</span>
                                            </>
                                        )}
                                        <button className="button ghost-danger" disabled={readOnly} onClick={() => deleteGoal(goal.id)}>{tr(language, "common.delete")}</button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="cycle-goal-add">
                        <input
                            value={goalTitleDraft}
                            onChange={(event) => setGoalTitleDraft(event.target.value)}
                            placeholder={tr(language, "onboarding.goal")}
                            disabled={readOnly}
                        />
                        <input
                            value={goalMetricDraft}
                            onChange={(event) => setGoalMetricDraft(event.target.value)}
                            placeholder={tr(language, "onboarding.metricOptional")}
                            disabled={readOnly}
                        />
                        <button className="button" disabled={readOnly || !goalTitleDraft.trim()} onClick={addGoal}>
                            {tr(language, "onboarding.goalAdd")}
                        </button>
                    </div>
                </section>

                <section className="cycle-section">
                    <div className="cycle-status-header">
                        <h3>{tr(language, "cycle.habitsTitle")}</h3>
                    </div>
                    {activeHabits.length === 0 && <p className="muted">{tr(language, "settings.noHabits")}</p>}
                    <div className="chip-wrap">
                        {activeHabits.map((habit) => (
                            <span key={habit.id} className="week-chip neutral">
                                <Icon icon={resolveHabitIcon(habit.emoji)} size={14} /> {habit.title}
                            </span>
                        ))}
                    </div>
                    <div className="button-row">
                        <button className="button" onClick={onOpenHabitsManager}>
                            {tr(language, "cycle.editHabits")}
                        </button>
                    </div>
                </section>

                <CycleVisionSection
                    cycle={cycle}
                    language={language}
                    readOnly={readOnly}
                    updateCycle={updateCycle}
                    compact
                    editing={isVisionEditing}
                    setEditing={setIsVisionEditing}
                />

                {isQuarterComplete && (
                    <section className="cycle-section cycle-review-section">
                        <div className="cycle-status-header">
                            <h3>{tr(language, "cycle.reviewTitle")}</h3>
                            <span className="muted">{tr(language, "cycle.reviewSubtitle")}</span>
                        </div>
                        {!showQuarterReviewForm ? (
                            <div className="button-row">
                                <button className="primary" onClick={() => setShowQuarterReviewForm(true)}>
                                    {tr(language, "app.startQuarterReview")}
                                </button>
                            </div>
                        ) : (
                            <div className="grid">
                                <label>
                                    {tr(language, "review.breakthroughs")}
                                    <textarea
                                        disabled={readOnly}
                                        value={finalReview.breakthroughs}
                                        onChange={(event) => {
                                            const value = event.target.value;
                                            updateCycle((prev) => ({
                                                ...prev,
                                                finalReview: { ...(prev.finalReview ?? finalReview), breakthroughs: value }
                                            }));
                                        }}
                                    />
                                </label>
                                <label>
                                    {tr(language, "review.keyLearning")}
                                    <textarea
                                        disabled={readOnly}
                                        value={finalReview.keyLearning}
                                        onChange={(event) => {
                                            const value = event.target.value;
                                            updateCycle((prev) => ({
                                                ...prev,
                                                finalReview: { ...(prev.finalReview ?? finalReview), keyLearning: value }
                                            }));
                                        }}
                                    />
                                </label>
                                <label>
                                    {tr(language, "review.lifeQuality")}
                                    <textarea
                                        disabled={readOnly}
                                        value={finalReview.lifeQuality}
                                        onChange={(event) => {
                                            const value = event.target.value;
                                            updateCycle((prev) => ({
                                                ...prev,
                                                finalReview: { ...(prev.finalReview ?? finalReview), lifeQuality: value }
                                            }));
                                        }}
                                    />
                                </label>
                                <label>
                                    {tr(language, "review.nextCycle")}
                                    <textarea
                                        disabled={readOnly}
                                        value={finalReview.nextCycle}
                                        onChange={(event) => {
                                            const value = event.target.value;
                                            updateCycle((prev) => ({
                                                ...prev,
                                                finalReview: { ...(prev.finalReview ?? finalReview), nextCycle: value }
                                            }));
                                        }}
                                    />
                                </label>
                            </div>
                        )}
                    </section>
                )}

                <div ref={archiveAnchorRef}>
                    <CycleArchiveSection
                        language={language}
                        dateFormat={dateFormat}
                        history={history}
                        readOnly={readOnly}
                        onViewCycle={onViewArchivedCycle}
                        onDeleteCycle={onDeleteArchivedCycle}
                    />
                </div>

                <section className="cycle-section cycle-actions-footer">
                    <div className="button-row">
                        <button className="button" onClick={() => archiveAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}>
                            {tr(language, "cycle.showArchive")}
                        </button>
                        <button className="button" disabled={readOnly} onClick={onArchiveRestart}>
                            {tr(language, "cycle.archiveCycle")}
                        </button>
                        <button className="primary" disabled={readOnly} onClick={onArchiveRestart}>
                            {tr(language, "cycle.startNewQuarter")}
                        </button>
                    </div>
                    <p className="muted">
                        {tr(language, "cycle.quarterRange", {
                            start: formatDate(cycle.startDate, dateFormat, language),
                            end: formatDate(quarterEndDate, dateFormat, language)
                        })}
                    </p>
                </section>
            </aside>
        </div>
    );
}
