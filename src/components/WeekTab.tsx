import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { t as tr } from "../i18n";
import {
    AppLanguage,
    Cycle,
    DateFormat,
    FinalReview,
    Id,
    WeeklyReview,
    WeeklyTarget
} from "../types";
import { formatRange } from "../utils";
import { ProgressBar } from "./ProgressBar";

type GoalDraft = {
    title: string;
    metric: string;
};

type TargetDraft = {
    title: string;
    target: number;
    unit: string;
};

type WeekTabProps = {
    cycle: Cycle;
    language: AppLanguage;
    dateFormat: DateFormat;
    isArchiveView: boolean;
    selectedWeek: number;
    setSelectedWeek: Dispatch<SetStateAction<number>>;
    goalDraft: GoalDraft;
    setGoalDraft: Dispatch<SetStateAction<GoalDraft>>;
    onAddGoal: () => void;
    onDeleteGoal: (goalId: Id) => void;
    updateCycle: (updater: (prev: Cycle) => Cycle) => void;
    targetDraft: TargetDraft;
    setTargetDraft: Dispatch<SetStateAction<TargetDraft>>;
    onAddWeeklyTarget: () => void;
    onCopyFromPreviousWeek: () => void;
    totalWeeklyTargets: WeeklyTarget[];
    draggingTargetId: Id | null;
    setDraggingTargetId: Dispatch<SetStateAction<Id | null>>;
    onReorderTargets: (weekIndex: number, fromIndex: number, toIndex: number) => void;
    onUpdateWeeklyTarget: (targetId: Id, changes: Partial<WeeklyTarget>) => void;
    onDeleteWeeklyTarget: (targetId: Id) => void;
    totalWeeklyDone: (weekIndex: number, targetId: Id) => number;
    weeklyReview: WeeklyReview;
    finalReview: FinalReview;
};

export function WeekTab({
    cycle,
    language,
    dateFormat,
    isArchiveView,
    selectedWeek,
    setSelectedWeek,
    goalDraft,
    setGoalDraft,
    onAddGoal,
    onDeleteGoal,
    updateCycle,
    targetDraft,
    setTargetDraft,
    onAddWeeklyTarget,
    onCopyFromPreviousWeek,
    totalWeeklyTargets,
    draggingTargetId,
    setDraggingTargetId,
    onReorderTargets,
    onUpdateWeeklyTarget,
    onDeleteWeeklyTarget,
    totalWeeklyDone,
    weeklyReview,
    finalReview
}: WeekTabProps) {
    const [editingGoalId, setEditingGoalId] = useState<Id | null>(null);
    const [goalEditDraft, setGoalEditDraft] = useState<GoalDraft>({ title: "", metric: "" });
    const [editingTargetId, setEditingTargetId] = useState<Id | null>(null);
    const [targetEditDraft, setTargetEditDraft] = useState<TargetDraft>({ title: "", target: 1, unit: "" });

    useEffect(() => {
        if (editingGoalId && !cycle.goals.some((goal) => goal.id === editingGoalId)) {
            setEditingGoalId(null);
        }
    }, [cycle.goals, editingGoalId]);

    useEffect(() => {
        if (editingTargetId && !totalWeeklyTargets.some((target) => target.id === editingTargetId)) {
            setEditingTargetId(null);
        }
    }, [editingTargetId, totalWeeklyTargets]);

    const startGoalEdit = (goal: Cycle["goals"][number]) => {
        setEditingTargetId(null);
        setEditingGoalId(goal.id);
        setGoalEditDraft({
            title: goal.title,
            metric: goal.metric ?? ""
        });
    };

    const cancelGoalEdit = () => {
        setEditingGoalId(null);
    };

    const saveGoalEdit = () => {
        if (!editingGoalId) return;
        const nextTitle = goalEditDraft.title.trim();
        if (!nextTitle) return;

        updateCycle((prev) => ({
            ...prev,
            goals: prev.goals.map((item) =>
                item.id === editingGoalId
                    ? {
                        ...item,
                        title: nextTitle,
                        metric: goalEditDraft.metric.trim() || undefined
                    }
                    : item
            )
        }));
        setEditingGoalId(null);
    };

    const startTargetEdit = (target: WeeklyTarget) => {
        setEditingGoalId(null);
        setEditingTargetId(target.id);
        setTargetEditDraft({
            title: target.title,
            target: target.target,
            unit: target.unit ?? ""
        });
    };

    const cancelTargetEdit = () => {
        setEditingTargetId(null);
    };

    const saveTargetEdit = () => {
        if (!editingTargetId) return;
        const nextTitle = targetEditDraft.title.trim();
        if (!nextTitle) return;

        const nextTarget = Math.max(1, Math.floor(targetEditDraft.target || 1));
        onUpdateWeeklyTarget(editingTargetId, {
            title: nextTitle,
            target: nextTarget,
            unit: targetEditDraft.unit.trim() || undefined
        });
        setEditingTargetId(null);
    };

    return (
        <section className="card">
            <div className="section-title">
                <h2>{tr(language, "week.title")}</h2>
                <span className="muted">{tr(language, "week.targets")}</span>
            </div>
            {isArchiveView && <p className="readonly-note">{tr(language, "app.archiveReadOnlyMode")}</p>}

            <div className="grid">
                <label>
                    {tr(language, "week.select")}
                    <select value={selectedWeek} onChange={(e) => setSelectedWeek(Number(e.target.value))}>
                        {cycle.weeks.map((week) => (
                            <option key={week.index} value={week.index}>
                                {tr(language, "app.headerWeekShort", { week: week.index })} · {formatRange(week.startDate, week.endDate, dateFormat, language)}
                            </option>
                        ))}
                    </select>
                </label>
            </div>

            <fieldset className="readonly-fieldset" disabled={isArchiveView}>
                <div className="subcard">
                    <h3>{tr(language, "week.maxGoals")}</h3>
                    <div className="grid">
                        <label>
                            {tr(language, "onboarding.goal")}
                            <input value={goalDraft.title} onChange={(e) => setGoalDraft({ ...goalDraft, title: e.target.value })} />
                        </label>
                        <label>
                            {tr(language, "onboarding.metricOptional")}
                            <input value={goalDraft.metric} onChange={(e) => setGoalDraft({ ...goalDraft, metric: e.target.value })} />
                        </label>
                    </div>
                    <button className="primary" onClick={onAddGoal} disabled={cycle.goals.length >= 3}>{tr(language, "onboarding.goalAdd")}</button>
                    <div className="list">
                        {cycle.goals.length === 0 && <p className="empty">{tr(language, "week.noGoals")}</p>}
                        {cycle.goals.map((goal) => {
                            const isEditing = editingGoalId === goal.id;
                            return (
                                <div key={goal.id} className={`list-item week-goal-row ${isEditing ? "editing" : ""}`}>
                                    <div className="week-goal-main">
                                        {isEditing ? (
                                            <div className="week-inline-edit">
                                                <input
                                                    value={goalEditDraft.title}
                                                    onChange={(e) => setGoalEditDraft((prev) => ({ ...prev, title: e.target.value }))}
                                                />
                                                <input
                                                    value={goalEditDraft.metric}
                                                    onChange={(e) => setGoalEditDraft((prev) => ({ ...prev, metric: e.target.value }))}
                                                    placeholder={tr(language, "onboarding.metricOptional")}
                                                />
                                            </div>
                                        ) : (
                                            <div className="week-goal-display">
                                                <strong className="week-goal-title">{goal.title}</strong>
                                                {goal.metric && <div className="muted week-goal-metric">{goal.metric}</div>}
                                            </div>
                                        )}
                                    </div>
                                    <div className="week-row-actions">
                                        {isEditing ? (
                                            <div className="week-edit-actions">
                                                <button className="primary" onClick={saveGoalEdit} disabled={!goalEditDraft.title.trim()}>{tr(language, "common.save")}</button>
                                                <button onClick={cancelGoalEdit}>{tr(language, "common.cancel")}</button>
                                            </div>
                                        ) : (
                                            <button
                                                className="icon-btn week-edit-btn"
                                                onClick={() => startGoalEdit(goal)}
                                                title={tr(language, "common.edit")}
                                                aria-label={tr(language, "common.edit")}
                                            >
                                                ✎
                                            </button>
                                        )}
                                        <button
                                            className="ghost-danger"
                                            onClick={() => {
                                                if (editingGoalId === goal.id) setEditingGoalId(null);
                                                onDeleteGoal(goal.id);
                                            }}
                                        >
                                            {tr(language, "common.delete")}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="grid">
                    <label>
                        {tr(language, "week.weeklyTarget")}
                        <input value={targetDraft.title} onChange={(e) => setTargetDraft({ ...targetDraft, title: e.target.value })} placeholder={tr(language, "week.weeklyTargetPlaceholder")} />
                    </label>
                    <label>
                        {tr(language, "week.targetAmount")}
                        <input type="number" min={1} value={targetDraft.target} onChange={(e) => setTargetDraft({ ...targetDraft, target: Number(e.target.value) })} />
                    </label>
                    <label>
                        {tr(language, "week.unitOptional")}
                        <input value={targetDraft.unit} onChange={(e) => setTargetDraft({ ...targetDraft, unit: e.target.value })} placeholder={tr(language, "week.unitExamples")} />
                    </label>
                </div>
                <div className="button-row">
                    <button className="primary" onClick={onAddWeeklyTarget}>{tr(language, "week.addWeeklyTarget")}</button>
                    {selectedWeek > 1 && (cycle.weeklyTargets[selectedWeek - 1] ?? []).length > 0 && (
                        <button onClick={onCopyFromPreviousWeek}>
                            {tr(language, "week.copyFromWeek", { week: selectedWeek - 1 })}
                        </button>
                    )}
                </div>

                <div className="list sortable">
                    {totalWeeklyTargets.length === 0 && <p className="empty">{tr(language, "week.noWeeklyTargets")}</p>}
                    {totalWeeklyTargets.map((target, index) => {
                        const isEditingTarget = editingTargetId === target.id;

                        return (
                            <div
                                key={target.id}
                                className={`list-item column week-target-item ${draggingTargetId === target.id ? "dragging" : ""} ${isEditingTarget ? "editing" : ""}`}
                                onDragOver={(e) => { e.preventDefault(); }}
                                onDrop={() => {
                                    if (draggingTargetId && draggingTargetId !== target.id) {
                                        const fromIdx = totalWeeklyTargets.findIndex((item) => item.id === draggingTargetId);
                                        onReorderTargets(selectedWeek, fromIdx, index);
                                    }
                                    setDraggingTargetId(null);
                                }}
                            >
                                <div className="list-row week-target-row">
                                    <div className="week-target-main">
                                        <div className="week-target-head">
                                            <div
                                                className="drag-handle"
                                                style={{ marginRight: "8px" }}
                                                draggable
                                                onDragStart={(e) => {
                                                    setDraggingTargetId(target.id);
                                                    e.dataTransfer.effectAllowed = "move";
                                                    const row = e.currentTarget.parentElement?.parentElement;
                                                    if (row) e.dataTransfer.setDragImage(row, 0, 0);
                                                }}
                                                onDragEnd={() => setDraggingTargetId(null)}
                                            >
                                                ⋮⋮
                                            </div>
                                            <div className="week-target-body">
                                                {isEditingTarget ? (
                                                    <div className="week-target-edit-fields">
                                                        <input
                                                            value={targetEditDraft.title}
                                                            onChange={(e) => setTargetEditDraft((prev) => ({ ...prev, title: e.target.value }))}
                                                        />
                                                        <input
                                                            type="number"
                                                            min={1}
                                                            value={targetEditDraft.target}
                                                            onChange={(e) => setTargetEditDraft((prev) => ({ ...prev, target: Number(e.target.value) }))}
                                                        />
                                                        <input
                                                            value={targetEditDraft.unit}
                                                            onChange={(e) => setTargetEditDraft((prev) => ({ ...prev, unit: e.target.value }))}
                                                            placeholder={tr(language, "week.unitPlaceholder")}
                                                        />
                                                    </div>
                                                ) : (
                                                    <>
                                                        <strong className="week-target-title">{target.title}</strong>
                                                        <div className="muted week-target-summary">{tr(language, "week.goalLabel", { target: target.target, unit: target.unit ?? "" })}</div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="week-target-controls">
                                        <div className="week-target-stepper">
                                            <button onClick={() => onUpdateWeeklyTarget(target.id, { done: Math.max(0, target.done - 1) })}>–</button>
                                            <span className="muted week-target-done">{target.done}</span>
                                            <button onClick={() => onUpdateWeeklyTarget(target.id, { done: Math.min(target.target, target.done + 1) })}>+</button>
                                        </div>
                                        <div className="week-target-actions">
                                            {isEditingTarget ? (
                                                <div className="week-edit-actions">
                                                    <button className="primary" onClick={saveTargetEdit} disabled={!targetEditDraft.title.trim()}>{tr(language, "common.save")}</button>
                                                    <button onClick={cancelTargetEdit}>{tr(language, "common.cancel")}</button>
                                                </div>
                                            ) : (
                                                <button
                                                    className="icon-btn week-edit-btn"
                                                    onClick={() => startTargetEdit(target)}
                                                    title={tr(language, "common.edit")}
                                                    aria-label={tr(language, "common.edit")}
                                                >
                                                    ✎
                                                </button>
                                            )}
                                            <button
                                                className="ghost-danger"
                                                onClick={() => {
                                                    if (editingTargetId === target.id) setEditingTargetId(null);
                                                    onDeleteWeeklyTarget(target.id);
                                                }}
                                            >
                                                {tr(language, "common.delete")}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="progress-bar-wrapper">
                                    <ProgressBar
                                        value={Math.max(target.done, totalWeeklyDone(selectedWeek, target.id))}
                                        max={target.target}
                                    />
                                </div>
                                <div className="muted" style={{ fontSize: "0.8rem" }}>
                                    {tr(language, "week.autoFromPlan", {
                                        done: totalWeeklyDone(selectedWeek, target.id),
                                        unit: target.unit ?? "",
                                        remaining: Math.max(0, target.target - Math.max(target.done, totalWeeklyDone(selectedWeek, target.id)))
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="divider" />

                <div className="subcard">
                    <h3>{tr(language, "week.vision")}</h3>
                    <textarea value={cycle.vision} onChange={(e) => updateCycle((prev) => ({ ...prev, vision: e.target.value }))} />
                </div>

                <div className="subcard">
                    <h3>{tr(language, "review.weekly", { week: selectedWeek })}</h3>
                    <div className="grid">
                        <label>
                            {tr(language, "review.good")}
                            <textarea
                                value={weeklyReview.good}
                                onChange={(e) =>
                                    updateCycle((prev) => ({
                                        ...prev,
                                        weeklyReviews: {
                                            ...prev.weeklyReviews,
                                            [selectedWeek]: { ...weeklyReview, good: e.target.value }
                                        }
                                    }))
                                }
                            />
                        </label>
                        <label>
                            {tr(language, "review.bad")}
                            <textarea
                                value={weeklyReview.bad}
                                onChange={(e) =>
                                    updateCycle((prev) => ({
                                        ...prev,
                                        weeklyReviews: {
                                            ...prev.weeklyReviews,
                                            [selectedWeek]: { ...weeklyReview, bad: e.target.value }
                                        }
                                    }))
                                }
                            />
                        </label>
                        <label>
                            {tr(language, "review.changeNextWeek")}
                            <textarea
                                value={weeklyReview.change}
                                onChange={(e) =>
                                    updateCycle((prev) => ({
                                        ...prev,
                                        weeklyReviews: {
                                            ...prev.weeklyReviews,
                                            [selectedWeek]: { ...weeklyReview, change: e.target.value }
                                        }
                                    }))
                                }
                            />
                        </label>
                    </div>
                </div>

                <div className="subcard">
                    <h3>{tr(language, "review.final12")}</h3>
                    <div className="grid">
                        <label>
                            {tr(language, "review.breakthroughs")}
                            <textarea
                                value={finalReview.breakthroughs}
                                onChange={(e) =>
                                    updateCycle((prev) => ({
                                        ...prev,
                                        finalReview: { ...finalReview, breakthroughs: e.target.value }
                                    }))
                                }
                            />
                        </label>
                        <label>
                            {tr(language, "review.lifeQuality")}
                            <textarea
                                value={finalReview.lifeQuality}
                                onChange={(e) =>
                                    updateCycle((prev) => ({
                                        ...prev,
                                        finalReview: { ...finalReview, lifeQuality: e.target.value }
                                    }))
                                }
                            />
                        </label>
                        <label>
                            {tr(language, "review.nextCycle")}
                            <textarea
                                value={finalReview.nextCycle}
                                onChange={(e) =>
                                    updateCycle((prev) => ({
                                        ...prev,
                                        finalReview: { ...finalReview, nextCycle: e.target.value }
                                    }))
                                }
                            />
                        </label>
                    </div>
                </div>
            </fieldset>
        </section>
    );
}
