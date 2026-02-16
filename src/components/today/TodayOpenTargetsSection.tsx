import { CSSProperties, useMemo } from "react";
import { t as tr } from "../../i18n";
import { AppLanguage, WeeklyTarget } from "../../types";
import { ProgressBar } from "../ProgressBar";

type TodayOpenTargetsSectionProps = {
    language: AppLanguage;
    selectedWeek: number;
    selectedWeekTargets: WeeklyTarget[];
    getWeeklyRemaining: (weekIndex: number) => Array<WeeklyTarget & { remaining: number }>;
};

const TARGET_ACCENT_PALETTE = [
    "#9bb6ea",
    "#93c6b3",
    "#dec690",
    "#b8a4d8",
    "#e3b394",
    "#a7b3bf"
];

export function TodayOpenTargetsSection({
    language,
    selectedWeek,
    selectedWeekTargets,
    getWeeklyRemaining
}: TodayOpenTargetsSectionProps) {
    const targetAccentById = useMemo(() => {
        const accentMap = new Map<string, string>();
        selectedWeekTargets.forEach((target, index) => {
            accentMap.set(String(target.id), TARGET_ACCENT_PALETTE[index % TARGET_ACCENT_PALETTE.length]);
        });
        return accentMap;
    }, [selectedWeekTargets]);

    return (
        <div className="subcard">
            <h3>{tr(language, "today.openThisWeek")}</h3>
            <div className="list">
                {selectedWeekTargets.length === 0 && <p className="empty">{tr(language, "today.noWeekTargets")}</p>}
                {getWeeklyRemaining(selectedWeek).map((target) => {
                    const done = Math.max(0, target.target - target.remaining);
                    const remaining = Math.max(0, target.target - done);
                    const accent = targetAccentById.get(String(target.id));
                    return (
                        <div
                            key={target.id}
                            className="list-item column planner-block-card has-target-accent today-open-target-item"
                            style={accent ? ({
                                "--planner-target-accent": accent,
                                "--open-target-accent": accent
                            } as CSSProperties) : undefined}
                        >
                            <div className="planner-block-header">
                                <strong className="planner-block-heading">{target.title}</strong>
                            </div>
                            <div className="planner-meta-row">
                                <span className="planner-meta-chip planner-target-chip today-open-target-chip">
                                    <span className="planner-target-dot" aria-hidden="true" />
                                    <span className="planner-target-label">{tr(language, "week.weeklyTarget")}</span>
                                </span>
                                <div className="muted today-open-target-meta">
                                    {tr(language, "today.remaining", { done, target: target.target, unit: target.unit ?? "", remaining })}
                                </div>
                            </div>
                            <ProgressBar value={done} max={target.target} showLabel={false} />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
