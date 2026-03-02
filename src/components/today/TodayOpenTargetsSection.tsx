import { CSSProperties, useMemo } from "react";
import { t as tr } from "../../i18n";
import { AppLanguage, Goal, WeeklyTarget } from "../../types";
import { Target } from "../ui/icons";
import { buildWeeklyTargetAccentMap } from "../../utils/weeklyTargetAccents";
import { ProgressBar } from "../ProgressBar";

type TodayOpenTargetsSectionProps = {
    language: AppLanguage;
    selectedWeek: number;
    goals: Goal[];
    selectedWeekTargets: WeeklyTarget[];
    getWeeklyRemaining: (weekIndex: number) => Array<WeeklyTarget & { remaining: number }>;
};

export function TodayOpenTargetsSection({
    language,
    selectedWeek,
    goals,
    selectedWeekTargets,
    getWeeklyRemaining
}: TodayOpenTargetsSectionProps) {
    const targetAccentById = useMemo(
        () => buildWeeklyTargetAccentMap(selectedWeekTargets, goals),
        [goals, selectedWeekTargets]
    );

    const goalNameById = useMemo(() => {
        const map = new Map<string, string>();
        goals.forEach((g) => map.set(String(g.id), g.title));
        return map;
    }, [goals]);

    return (
        <section className="subcard today-open-targets-section">
            <div className="today-section-header">
                <div className="today-section-header-left">
                    <Target size={18} weight="duotone" className="today-section-icon" aria-hidden="true" />
                    <h3 className="today-section-title">{tr(language, "today.openThisWeek")}</h3>
                </div>
            </div>
            <div className="list">
                {selectedWeekTargets.length === 0 && <p className="empty">{tr(language, "today.noWeekTargets")}</p>}
                {getWeeklyRemaining(selectedWeek).map((target) => {
                    const done = Math.max(0, target.target - target.remaining);
                    const remaining = Math.max(0, target.target - done);
                    const accent = targetAccentById.get(String(target.id));
                    const goalName = target.goalId ? goalNameById.get(String(target.goalId)) : null;
                    return (
                        <div
                            key={target.id}
                            className="list-item column planner-block-card has-target-accent today-open-target-item weekly-target"
                            style={accent ? ({
                                "--planner-target-accent": accent,
                                "--open-target-accent": accent
                            } as CSSProperties) : undefined}
                        >
                            <div className="planner-block-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", width: "100%" }}>
                                <strong className="planner-block-heading">{target.title}</strong>
                                {goalName && (
                                    <span className="planner-meta-chip planner-target-chip today-open-target-chip" style={{ marginLeft: "auto", flexShrink: 0 }}>
                                        <span className="planner-target-dot" aria-hidden="true" />
                                        <span className="planner-target-label">{goalName}</span>
                                    </span>
                                )}
                            </div>
                            <div className="muted today-open-target-meta" style={{ textAlign: "left" }}>
                                {tr(language, "today.remaining", { done, target: target.target, unit: target.unit ?? "", remaining })}
                            </div>
                            <ProgressBar value={done} max={target.target} showLabel={false} />
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
