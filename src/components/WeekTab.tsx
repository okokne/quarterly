import { Dispatch, SetStateAction, useState } from "react";
import { t as tr } from "../i18n";
import {
    AppLanguage,
    Cycle,
    DateFormat,
    Id,
    WeeklyReview,
    WeeklyTarget
} from "../types";
import { formatRange, getWeekProgressPercent } from "../utils";
import { useWeekTabEditing } from "../hooks/useWeekTabEditing";
import { WeekGoalsSection } from "./week/WeekGoalsSection";
import { WeekReviewsSection } from "./week/WeekReviewsSection";
import { WeekTargetsSection } from "./week/WeekTargetsSection";
import { TargetDraft } from "./week/types";

type WeekTabProps = {
    cycle: Cycle;
    language: AppLanguage;
    dateFormat: DateFormat;
    isArchiveView: boolean;
    selectedWeek: number;
    setSelectedWeek: Dispatch<SetStateAction<number>>;
    updateCycle: (updater: (prev: Cycle) => Cycle) => void;
    targetDraft: TargetDraft;
    setTargetDraft: Dispatch<SetStateAction<TargetDraft>>;
    onAddWeeklyTarget: () => boolean;
    onCopyFromPreviousWeek: () => void;
    totalWeeklyTargets: WeeklyTarget[];
    draggingTargetId: Id | null;
    setDraggingTargetId: Dispatch<SetStateAction<Id | null>>;
    onReorderTargets: (weekIndex: number, fromIndex: number, toIndex: number) => void;
    onUpdateWeeklyTarget: (targetId: Id, changes: Partial<WeeklyTarget>) => void;
    onAdjustWeeklyTarget: (targetId: Id, delta: number) => void;
    onDeleteWeeklyTarget: (targetId: Id) => void;
    totalWeeklyDone: (weekIndex: number, targetId: Id) => number;
    weeklyReview: WeeklyReview;
    onOpenCycleDrawer: () => void;
};

export function WeekTab({
    cycle,
    language,
    dateFormat,
    isArchiveView,
    selectedWeek,
    setSelectedWeek,
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
    onAdjustWeeklyTarget,
    onDeleteWeeklyTarget,
    totalWeeklyDone,
    weeklyReview,
    onOpenCycleDrawer
}: WeekTabProps) {
    const {
        editingTargetId,
        targetEditDraft,
        setTargetEditDraft,
        startTargetEdit,
        cancelTargetEdit,
        saveTargetEdit,
        setEditingTargetId
    } = useWeekTabEditing({
        totalWeeklyTargets,
        onUpdateWeeklyTarget
    });
    const weekCompletionPercent = getWeekProgressPercent(cycle, selectedWeek);
    const [showTargetComposer, setShowTargetComposer] = useState(false);

    return (
        <section className="card week-tab-card">
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

            <WeekGoalsSection
                language={language}
                cycle={cycle}
                onOpenCycleDrawer={onOpenCycleDrawer}
            />

            <div className="subcard week-targets-main-card">
                <div className="week-targets-main-header">
                    <div className="week-targets-main-title">
                        <h3>{tr(language, "week.targets")}</h3>
                        {!isArchiveView && (
                            <button
                                type="button"
                                className="week-target-plus-btn"
                                title={tr(language, "week.addWeeklyTarget")}
                                aria-label={tr(language, "week.addWeeklyTarget")}
                                onClick={() => setShowTargetComposer(true)}
                            >
                                +
                            </button>
                        )}
                    </div>
                    <span className="muted">{tr(language, "week.weekSummary", { week: selectedWeek, percent: weekCompletionPercent })}</span>
                </div>
                <fieldset className="readonly-fieldset" disabled={isArchiveView}>
                    <WeekTargetsSection
                        language={language}
                        cycle={cycle}
                        isArchiveView={isArchiveView}
                        selectedWeek={selectedWeek}
                        showComposer={showTargetComposer}
                        setShowComposer={setShowTargetComposer}
                        targetDraft={targetDraft}
                        setTargetDraft={setTargetDraft}
                        onAddWeeklyTarget={onAddWeeklyTarget}
                        onCopyFromPreviousWeek={onCopyFromPreviousWeek}
                        totalWeeklyTargets={totalWeeklyTargets}
                        draggingTargetId={draggingTargetId}
                        setDraggingTargetId={setDraggingTargetId}
                        onReorderTargets={onReorderTargets}
                        onAdjustWeeklyTarget={onAdjustWeeklyTarget}
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
                </fieldset>
            </div>

            <div className="subcard week-review-main-card">
                <fieldset className="readonly-fieldset" disabled={isArchiveView}>
                    <WeekReviewsSection
                        language={language}
                        selectedWeek={selectedWeek}
                        weeklyReview={weeklyReview}
                        updateCycle={updateCycle}
                    />
                </fieldset>
            </div>
        </section>
    );
}
