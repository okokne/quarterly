import { CSSProperties, useMemo, useState } from "react";
import { Pencil } from "./ui/icons";
import { t as tr } from "../i18n";
import { AppTab } from "../navigation";
import { AppLanguage, Cycle, DateFormat, Habit, Id } from "../types";
import { formatRange, getWeekLabel, getWeekProgressPercent } from "../utils";
import { CycleArchiveSection } from "./cycle/CycleArchiveSection";
import { CycleFinalReviewFlow } from "./cycle/CycleFinalReviewFlow";
import { Icon } from "./ui/Icon";
import { resolveHabitIcon } from "./ui/habitIcons";

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

const PLAN_GOAL_COLORS = ["#e07b4c", "#4a7cf7", "#2f9f7f"];

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
    const activeHabits = useMemo(() => habits.slice(0, 8), [habits]);

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
                </div>
                <p className="plan-goals-subtitle muted">{tr(language, "plan.goalsSubtitle")}</p>
                {cycle.goals.length === 0 ? (
                    <p className="empty">{tr(language, "stats.noGoalsEmptyState")}</p>
                ) : (
                    <div className="plan-goals-grid">
                        {cycle.goals.slice(0, 3).map((goal, index) => (
                            <article
                                key={goal.id}
                                className="plan-goal-chip"
                                style={{ "--plan-goal-color": PLAN_GOAL_COLORS[index % PLAN_GOAL_COLORS.length] } as CSSProperties}
                            >
                                <strong>{goal.title}</strong>
                                {goal.metric && <span>{goal.metric}</span>}
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
                    <div className="chip-wrap">
                        {activeHabits.map((habit) => (
                            <span key={habit.id} className="week-chip neutral">
                                <Icon icon={resolveHabitIcon(habit.emoji)} size={15} /> {habit.title}
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
