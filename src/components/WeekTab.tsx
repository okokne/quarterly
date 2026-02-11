import { Dispatch, SetStateAction } from "react";
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
                        {cycle.goals.map((goal) => (
                            <div key={goal.id} className="list-item">
                                <div className="inline-fields">
                                    <input
                                        value={goal.title}
                                        onChange={(e) =>
                                            updateCycle((prev) => ({
                                                ...prev,
                                                goals: prev.goals.map((item) => (item.id === goal.id ? { ...item, title: e.target.value } : item))
                                            }))
                                        }
                                    />
                                    <input
                                        value={goal.metric ?? ""}
                                        onChange={(e) =>
                                            updateCycle((prev) => ({
                                                ...prev,
                                                goals: prev.goals.map((item) => (item.id === goal.id ? { ...item, metric: e.target.value } : item))
                                            }))
                                        }
                                    />
                                </div>
                                <button onClick={() => onDeleteGoal(goal.id)}>{tr(language, "common.delete")}</button>
                            </div>
                        ))}
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
                    {totalWeeklyTargets.map((target, index) => (
                        <div
                            key={target.id}
                            className={`list-item column ${draggingTargetId === target.id ? "dragging" : ""}`}
                            onDragOver={(e) => { e.preventDefault(); }}
                            onDrop={() => {
                                if (draggingTargetId && draggingTargetId !== target.id) {
                                    const fromIdx = totalWeeklyTargets.findIndex((item) => item.id === draggingTargetId);
                                    onReorderTargets(selectedWeek, fromIdx, index);
                                }
                                setDraggingTargetId(null);
                            }}
                        >
                            <div className="list-row">
                                <div style={{ display: "flex", alignItems: "center" }}>
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
                                    <div>
                                        <div className="inline-fields">
                                            <input
                                                value={target.title}
                                                onChange={(e) => onUpdateWeeklyTarget(target.id, { title: e.target.value })}
                                            />
                                            <input
                                                type="number"
                                                min={1}
                                                value={target.target}
                                                onChange={(e) => onUpdateWeeklyTarget(target.id, { target: Number(e.target.value) })}
                                            />
                                            <input
                                                value={target.unit ?? ""}
                                                onChange={(e) => onUpdateWeeklyTarget(target.id, { unit: e.target.value })}
                                                placeholder={tr(language, "week.unitPlaceholder")}
                                            />
                                        </div>
                                        <div className="muted">{tr(language, "week.goalLabel", { target: target.target, unit: target.unit ?? "" })}</div>
                                    </div>
                                </div>
                                <div className="inline-fields">
                                    <button onClick={() => onUpdateWeeklyTarget(target.id, { done: Math.max(0, target.done - 1) })}>–</button>
                                    <span className="muted">{target.done}</span>
                                    <button onClick={() => onUpdateWeeklyTarget(target.id, { done: Math.min(target.target, target.done + 1) })}>+</button>
                                    <button onClick={() => onDeleteWeeklyTarget(target.id)}>{tr(language, "common.delete")}</button>
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
                    ))}
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
