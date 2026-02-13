import { Dispatch, SetStateAction } from "react";
import { useTouchTargetReorder } from "../../hooks/useTouchTargetReorder";
import { t as tr } from "../../i18n";
import { AppLanguage, Cycle, Id, WeeklyTarget } from "../../types";
import { ProgressBar } from "../ProgressBar";
import { TargetDraft } from "./types";

type WeekTargetsSectionProps = {
    language: AppLanguage;
    cycle: Cycle;
    isArchiveView: boolean;
    selectedWeek: number;
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
    editingTargetId: Id | null;
    targetEditDraft: TargetDraft;
    setTargetEditDraft: Dispatch<SetStateAction<TargetDraft>>;
    startTargetEdit: (target: WeeklyTarget) => void;
    cancelTargetEdit: () => void;
    saveTargetEdit: () => void;
    setEditingTargetId: Dispatch<SetStateAction<Id | null>>;
};

export function WeekTargetsSection({
    language,
    cycle,
    isArchiveView,
    selectedWeek,
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
    editingTargetId,
    targetEditDraft,
    setTargetEditDraft,
    startTargetEdit,
    cancelTargetEdit,
    saveTargetEdit,
    setEditingTargetId
}: WeekTargetsSectionProps) {
    const {
        touchDraggingTargetId,
        touchDragOverTargetId,
        startTouchReorder,
        clearPendingTouchStart,
        endTouchReorder
    } = useTouchTargetReorder({
        isArchiveView,
        selectedWeek,
        totalWeeklyTargets,
        onReorderTargets
    });

    return (
        <>
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
                {totalWeeklyTargets.map((target, index) => {
                    const isEditingTarget = editingTargetId === target.id;
                    const isTouchDragActive = touchDraggingTargetId === target.id;
                    const isTouchDragOver = touchDragOverTargetId === target.id && !isTouchDragActive;

                    return (
                        <div
                            key={target.id}
                            className={`list-item column week-target-item ${draggingTargetId === target.id ? "dragging" : ""} ${isEditingTarget ? "editing" : ""} ${isTouchDragActive ? "touch-drag-active" : ""} ${isTouchDragOver ? "touch-drag-over" : ""}`}
                            data-target-index={index}
                            onDragOver={(e) => {
                                if (isArchiveView) return;
                                e.preventDefault();
                                e.dataTransfer.dropEffect = "move";
                            }}
                            onDrop={() => {
                                if (isArchiveView) return;
                                if (draggingTargetId && draggingTargetId !== target.id) {
                                    const fromIdx = totalWeeklyTargets.findIndex((item) => item.id === draggingTargetId);
                                    if (fromIdx >= 0) {
                                        onReorderTargets(selectedWeek, fromIdx, index);
                                    }
                                }
                                setDraggingTargetId(null);
                            }}
                        >
                            <div className="list-row week-target-row">
                                <div className="week-target-main">
                                    <div className="week-target-head">
                                        <div
                                            className="drag-handle"
                                            style={{ marginRight: "8px" }}
                                            draggable={!isArchiveView}
                                            onPointerDown={(e) => startTouchReorder(e, target.id, index)}
                                            onPointerUp={(e) => {
                                                clearPendingTouchStart(e.pointerId);
                                                endTouchReorder(e.pointerId);
                                            }}
                                            onPointerCancel={(e) => {
                                                clearPendingTouchStart(e.pointerId);
                                                endTouchReorder(e.pointerId);
                                            }}
                                            onDragStart={(e) => {
                                                if (isArchiveView) {
                                                    e.preventDefault();
                                                    return;
                                                }
                                                setDraggingTargetId(target.id);
                                                e.dataTransfer.effectAllowed = "move";
                                                const row = e.currentTarget.parentElement?.parentElement;
                                                if (row) e.dataTransfer.setDragImage(row, 0, 0);
                                            }}
                                            onDragEnd={() => setDraggingTargetId(null)}
                                        >
                                            ⋮⋮
                                        </div>
                                        <div className="week-target-body">
                                            {isEditingTarget ? (
                                                <div className="week-target-edit-fields">
                                                    <input
                                                        value={targetEditDraft.title}
                                                        onChange={(e) => setTargetEditDraft((prev) => ({ ...prev, title: e.target.value }))}
                                                    />
                                                    <input
                                                        type="number"
                                                        min={1}
                                                        value={targetEditDraft.target}
                                                        onChange={(e) => setTargetEditDraft((prev) => ({ ...prev, target: Number(e.target.value) }))}
                                                    />
                                                    <input
                                                        value={targetEditDraft.unit}
                                                        onChange={(e) => setTargetEditDraft((prev) => ({ ...prev, unit: e.target.value }))}
                                                        placeholder={tr(language, "week.unitPlaceholder")}
                                                    />
                                                </div>
                                            ) : (
                                                <>
                                                    <strong className="week-target-title">{target.title}</strong>
                                                    <div className="muted week-target-summary">{tr(language, "week.goalLabel", { target: target.target, unit: target.unit ?? "" })}</div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="week-target-controls">
                                    <div className="week-target-stepper">
                                        <button onClick={() => onUpdateWeeklyTarget(target.id, { done: Math.max(0, target.done - 1) })}>–</button>
                                        <span className="muted week-target-done">{target.done}</span>
                                        <button onClick={() => onUpdateWeeklyTarget(target.id, { done: Math.min(target.target, target.done + 1) })}>+</button>
                                    </div>
                                    <div className="week-target-actions">
                                        {isEditingTarget ? (
                                            <div className="week-edit-actions">
                                                <button className="primary" onClick={saveTargetEdit} disabled={!targetEditDraft.title.trim()}>{tr(language, "common.save")}</button>
                                                <button onClick={cancelTargetEdit}>{tr(language, "common.cancel")}</button>
                                            </div>
                                        ) : (
                                            <button
                                                className="icon-btn week-edit-btn"
                                                onClick={() => startTargetEdit(target)}
                                                title={tr(language, "common.edit")}
                                                aria-label={tr(language, "common.edit")}
                                            >
                                                ✎
                                            </button>
                                        )}
                                        <button
                                            className="ghost-danger"
                                            onClick={() => {
                                                if (editingTargetId === target.id) setEditingTargetId(null);
                                                onDeleteWeeklyTarget(target.id);
                                            }}
                                        >
                                            {tr(language, "common.delete")}
                                        </button>
                                    </div>
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
                    );
                })}
            </div>
        </>
    );
}
