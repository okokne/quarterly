import { Dispatch, SetStateAction, useEffect, useMemo, useState } from "react";
import { Pencil } from "./ui/icons";
import { t as tr } from "../i18n";
import {
    AppLanguage,
    Cycle,
    DateFormat,
    Id,
    WeeklyReview,
    WeeklyTarget
} from "../types";
import { formatRange, getWeekLabel, getWeekProgressPercent, normalizeWeekName } from "../utils";
import { useWeekTabEditing } from "../hooks/useWeekTabEditing";
import { WeekGoalsSection } from "./week/WeekGoalsSection";
import { WeekReviewsSection } from "./week/WeekReviewsSection";
import { WeekTargetsSection } from "./week/WeekTargetsSection";
import { TargetDraft } from "./week/types";
import { Icon } from "./ui/Icon";

type WeekTabProps = {
    cycle: Cycle;
    language: AppLanguage;
    dateFormat: DateFormat;
    isArchiveView: boolean;
    currentWeekIndex: number;
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
    focusTargetId: Id | null;
    onFocusTargetHandled: () => void;
    onOpenCycleDrawer: () => void;
};

export function WeekTab({
    cycle,
    language,
    dateFormat,
    isArchiveView,
    currentWeekIndex,
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
    focusTargetId,
    onFocusTargetHandled,
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
    const [showWeekNameEditor, setShowWeekNameEditor] = useState(false);
    const [weekNameDraft, setWeekNameDraft] = useState("");
    const isCurrentWeekSelected = selectedWeek === currentWeekIndex;
    const selectedWeekData = useMemo(
        () => cycle.weeks.find((week) => week.index === selectedWeek),
        [cycle.weeks, selectedWeek]
    );
    const selectedWeekName = selectedWeekData?.weekName ?? "";
    const selectedWeekLabel = getWeekLabel(cycle, selectedWeek, language);
    const currentWeekLabel = getWeekLabel(cycle, currentWeekIndex, language);

    useEffect(() => {
        setShowWeekNameEditor(false);
        setWeekNameDraft(selectedWeekName);
    }, [selectedWeek, selectedWeekName]);

    const saveWeekName = () => {
        const normalized = normalizeWeekName(weekNameDraft);
        updateCycle((prev) => ({
            ...prev,
            weeks: prev.weeks.map((week) => (
                week.index === selectedWeek
                    ? { ...week, weekName: normalized }
                    : week
            ))
        }));
        setShowWeekNameEditor(false);
    };

    return (
        <section className="card week-tab-card">
            <div className="section-title">
                <h2>{tr(language, "week.title")}</h2>
                <span className="muted">{tr(language, "week.targets")}</span>
            </div>
            <div className="week-name-row">
                {!showWeekNameEditor && (
                    <>
                        <strong className="week-name-label">{selectedWeekLabel}</strong>
                        {!isArchiveView && (
                            <button
                                type="button"
                                className={`week-name-edit-btn ${selectedWeekName ? "icon-only" : ""}`}
                                onClick={() => {
                                    setWeekNameDraft(selectedWeekName);
                                    setShowWeekNameEditor(true);
                                }}
                                title={selectedWeekName ? tr(language, "week.editName") : tr(language, "week.addName")}
                                aria-label={selectedWeekName ? tr(language, "week.editName") : tr(language, "week.addName")}
                            >
                                {selectedWeekName ? <Icon icon={Pencil} size={14} /> : tr(language, "week.addName")}
                            </button>
                        )}
                    </>
                )}
                {showWeekNameEditor && !isArchiveView && (
                    <div className="week-name-editor">
                        <input
                            value={weekNameDraft}
                            onChange={(event) => setWeekNameDraft(event.target.value)}
                            placeholder={tr(language, "week.namePlaceholder")}
                            maxLength={60}
                        />
                        <div className="button-row">
                            <button
                                type="button"
                                className="primary"
                                onClick={saveWeekName}
                            >
                                {tr(language, "common.save")}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowWeekNameEditor(false);
                                    setWeekNameDraft(selectedWeekName);
                                }}
                            >
                                {tr(language, "common.cancel")}
                            </button>
                        </div>
                    </div>
                )}
            </div>
            {isArchiveView && <p className="readonly-note">{tr(language, "app.archiveReadOnlyMode")}</p>}

            <div className="grid">
                <label>
                    {tr(language, "week.select")}
                    <select value={selectedWeek} onChange={(e) => setSelectedWeek(Number(e.target.value))}>
                        {cycle.weeks.map((week) => (
                            <option key={week.index} value={week.index}>
                                {getWeekLabel(cycle, week.index, language)} · {formatRange(week.startDate, week.endDate, dateFormat, language)}
                            </option>
                        ))}
                    </select>
                </label>
            </div>
            {isCurrentWeekSelected ? (
                <p className="week-selected-week-note muted">{tr(language, "week.currentWeekSelected")}</p>
            ) : (
                <div className="week-selected-week-note planning">
                    <p>{tr(language, "week.planningWeekNotice", { weekLabel: selectedWeekLabel })}</p>
                    <p className="muted">{tr(language, "week.currentWeekNotice", { weekLabel: currentWeekLabel })}</p>
                </div>
            )}

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
                    <span className="muted">{tr(language, "week.weekSummary", { weekLabel: selectedWeekLabel, percent: weekCompletionPercent })}</span>
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
                        focusTargetId={focusTargetId}
                        onFocusHandled={onFocusTargetHandled}
                    />
                </fieldset>
            </div>

            <div className="subcard week-review-main-card">
                <fieldset className="readonly-fieldset" disabled={isArchiveView}>
                    <WeekReviewsSection
                        language={language}
                        cycle={cycle}
                        selectedWeek={selectedWeek}
                        weeklyReview={weeklyReview}
                        updateCycle={updateCycle}
                    />
                </fieldset>
            </div>
        </section>
    );
}
