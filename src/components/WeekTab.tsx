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
import { useWeekTabEditing } from "../hooks/useWeekTabEditing";
import { WeekGoalsSection } from "./week/WeekGoalsSection";
import { WeekReviewsSection } from "./week/WeekReviewsSection";
import { WeekTargetsSection } from "./week/WeekTargetsSection";
import { GoalDraft, TargetDraft } from "./week/types";

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
    const {
        editingGoalId,
        goalEditDraft,
        setGoalEditDraft,
        startGoalEdit,
        cancelGoalEdit,
        saveGoalEdit,
        setEditingGoalId,
        editingTargetId,
        targetEditDraft,
        setTargetEditDraft,
        startTargetEdit,
        cancelTargetEdit,
        saveTargetEdit,
        setEditingTargetId
    } = useWeekTabEditing({
        cycle,
        totalWeeklyTargets,
        updateCycle,
        onUpdateWeeklyTarget
    });

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
                <WeekGoalsSection
                    language={language}
                    cycle={cycle}
                    goalDraft={goalDraft}
                    setGoalDraft={setGoalDraft}
                    onAddGoal={onAddGoal}
                    onDeleteGoal={onDeleteGoal}
                    editingGoalId={editingGoalId}
                    goalEditDraft={goalEditDraft}
                    setGoalEditDraft={setGoalEditDraft}
                    startGoalEdit={startGoalEdit}
                    cancelGoalEdit={cancelGoalEdit}
                    saveGoalEdit={saveGoalEdit}
                    setEditingGoalId={setEditingGoalId}
                />

                <WeekTargetsSection
                    language={language}
                    cycle={cycle}
                    isArchiveView={isArchiveView}
                    selectedWeek={selectedWeek}
                    targetDraft={targetDraft}
                    setTargetDraft={setTargetDraft}
                    onAddWeeklyTarget={onAddWeeklyTarget}
                    onCopyFromPreviousWeek={onCopyFromPreviousWeek}
                    totalWeeklyTargets={totalWeeklyTargets}
                    draggingTargetId={draggingTargetId}
                    setDraggingTargetId={setDraggingTargetId}
                    onReorderTargets={onReorderTargets}
                    onUpdateWeeklyTarget={onUpdateWeeklyTarget}
                    onDeleteWeeklyTarget={onDeleteWeeklyTarget}
                    totalWeeklyDone={totalWeeklyDone}
                    editingTargetId={editingTargetId}
                    targetEditDraft={targetEditDraft}
                    setTargetEditDraft={setTargetEditDraft}
                    startTargetEdit={startTargetEdit}
                    cancelTargetEdit={cancelTargetEdit}
                    saveTargetEdit={saveTargetEdit}
                    setEditingTargetId={setEditingTargetId}
                />

                <WeekReviewsSection
                    cycle={cycle}
                    language={language}
                    selectedWeek={selectedWeek}
                    weeklyReview={weeklyReview}
                    finalReview={finalReview}
                    updateCycle={updateCycle}
                />
            </fieldset>
        </section>
    );
}
