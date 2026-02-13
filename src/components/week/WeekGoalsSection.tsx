import { Dispatch, SetStateAction } from "react";
import { t as tr } from "../../i18n";
import { AppLanguage, Cycle, Id } from "../../types";
import { GoalDraft } from "./types";

type WeekGoalsSectionProps = {
    language: AppLanguage;
    cycle: Cycle;
    goalDraft: GoalDraft;
    setGoalDraft: Dispatch<SetStateAction<GoalDraft>>;
    onAddGoal: () => void;
    onDeleteGoal: (goalId: Id) => void;
    editingGoalId: Id | null;
    goalEditDraft: GoalDraft;
    setGoalEditDraft: Dispatch<SetStateAction<GoalDraft>>;
    startGoalEdit: (goal: Cycle["goals"][number]) => void;
    cancelGoalEdit: () => void;
    saveGoalEdit: () => void;
    setEditingGoalId: Dispatch<SetStateAction<Id | null>>;
};

export function WeekGoalsSection({
    language,
    cycle,
    goalDraft,
    setGoalDraft,
    onAddGoal,
    onDeleteGoal,
    editingGoalId,
    goalEditDraft,
    setGoalEditDraft,
    startGoalEdit,
    cancelGoalEdit,
    saveGoalEdit,
    setEditingGoalId
}: WeekGoalsSectionProps) {
    return (
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
    );
}
