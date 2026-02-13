import { t as tr } from "../../i18n";
import { AppLanguage, WeeklyTarget } from "../../types";
import { ProgressBar } from "../ProgressBar";

type TodayOpenTargetsSectionProps = {
    language: AppLanguage;
    selectedWeek: number;
    selectedWeekTargets: WeeklyTarget[];
    getWeeklyRemaining: (weekIndex: number) => Array<WeeklyTarget & { remaining: number }>;
};

export function TodayOpenTargetsSection({
    language,
    selectedWeek,
    selectedWeekTargets,
    getWeeklyRemaining
}: TodayOpenTargetsSectionProps) {
    return (
        <div className="subcard">
            <h3>{tr(language, "today.openThisWeek")}</h3>
            <div className="list">
                {selectedWeekTargets.length === 0 && <p className="empty">{tr(language, "today.noWeekTargets")}</p>}
                {getWeeklyRemaining(selectedWeek).map((target) => {
                    const done = Math.max(0, target.target - target.remaining);
                    const remaining = Math.max(0, target.target - done);
                    return (
                        <div key={target.id} className="list-item column">
                            <div className="list-row">
                                <div>
                                    <strong>{target.title}</strong>
                                    <div className="muted">{tr(language, "today.remaining", { done, target: target.target, unit: target.unit ?? "", remaining })}</div>
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
