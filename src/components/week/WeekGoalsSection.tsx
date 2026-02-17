import { CSSProperties } from "react";
import { t as tr } from "../../i18n";
import { AppLanguage, Cycle } from "../../types";
import { buildGoalAccentMap } from "../../utils/weeklyTargetAccents";

type WeekGoalsSectionProps = {
    language: AppLanguage;
    cycle: Cycle;
    onOpenCycleDrawer: () => void;
};

export function WeekGoalsSection({
    language,
    cycle,
    onOpenCycleDrawer
}: WeekGoalsSectionProps) {
    const goalAccentById = buildGoalAccentMap(cycle.goals);

    return (
        <div className="subcard week-goals-context-card">
            <div className="week-goals-context-header">
                <h3>{tr(language, "week.quarterFocusTitle")}</h3>
                <button type="button" onClick={onOpenCycleDrawer}>
                    {tr(language, "week.editGoalsInQuarter")}
                </button>
            </div>
            <div className="stats-goal-list week-goals-readonly-list">
                {cycle.goals.length === 0 && <p className="empty">{tr(language, "week.noGoals")}</p>}
                {cycle.goals.map((goal, index) => (
                    <div
                        key={goal.id}
                        className="stats-goal-card week-focus-goal-card has-goal-accent"
                        style={{ "--goal-accent": goalAccentById.get(String(goal.id)) } as CSSProperties}
                    >
                        <span className="planner-meta-chip week-focus-goal-index">{index + 1}</span>
                        <div className="stats-goal-content week-focus-goal-content">
                            <strong className="stats-goal-title week-focus-goal-title">{goal.title}</strong>
                            {goal.metric && <span className="planner-meta-chip week-focus-goal-metric">{goal.metric}</span>}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
