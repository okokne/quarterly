import { Dispatch, SetStateAction } from "react";
import { Pencil } from "../ui/icons";
import { useTouchTargetReorder } from "../../hooks/useTouchTargetReorder";
import { t as tr } from "../../i18n";
import { AppLanguage, Cycle, Id, WeeklyTarget } from "../../types";
import { ProgressBar } from "../ProgressBar";
import { Icon } from "../ui/Icon";
import { TargetDraft } from "./types";

type WeekTargetsSectionProps = {
    language: AppLanguage;
    cycle: Cycle;
    isArchiveView: boolean;
    selectedWeek: number;
    showComposer: boolean;
    setShowComposer: Dispatch<SetStateAction<boolean>>;
    targetDraft: TargetDraft;
    setTargetDraft: Dispatch<SetStateAction<TargetDraft>>;
    onAddWeeklyTarget: () => boolean;
    onCopyFromPreviousWeek: () => void;
    totalWeeklyTargets: WeeklyTarget[];
    draggingTargetId: Id | null;
    setDraggingTargetId: Dispatch<SetStateAction<Id | null>>;
    onReorderTargets: (weekIndex: number, fromIndex: number, toIndex: number) => void;
    onAdjustWeeklyTarget: (targetId: Id, delta: number) => void;
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
    showComposer,
    setShowComposer,
    targetDraft,
    setTargetDraft,
    onAddWeeklyTarget,
    onCopyFromPreviousWeek,
    totalWeeklyTargets,
    draggingTargetId,
    setDraggingTargetId,
    onReorderTargets,
    onAdjustWeeklyTarget,
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

    const handleAddTarget = () => {
        const didAdd = onAddWeeklyTarget();
        if (!didAdd) return;
        setShowComposer(false);
    };

    return (
        <>
            <div className="button-row week-target-composer-toggle-row">
                {selectedWeek > 1 && (cycle.weeklyTargets[selectedWeek - 1] ?? []).length > 0 && (
                    <button type="button" onClick={onCopyFromPreviousWeek}>
                        {tr(language, "week.copyFromWeek", { week: selectedWeek - 1 })}
                    </button>
                )}
            </div>

            {showComposer && !isArchiveView && (
                <div className="week-target-composer">
                    <div className="grid">
                        <label>
                            {tr(language, "week.weeklyTarget")}
                            <input
                                value={targetDraft.title}
                                onChange={(e) => setTargetDraft({ ...targetDraft, title: e.target.value })}
                                placeholder={tr(language, "week.weeklyTargetPlaceholder")}
                            />
                        </label>
                        <label>
                            {tr(language, "week.targetAmount")}
                            <input
                                type="number"
                                min={1}
                                value={targetDraft.target}
                                onChange={(e) => setTargetDraft({ ...targetDraft, target: Number(e.target.value) })}
                            />
                        </label>
                        <label>
                            {tr(language, "week.unitOptional")}
                            <input
                                value={targetDraft.unit}
                                onChange={(e) => setTargetDraft({ ...targetDraft, unit: e.target.value })}
                                placeholder={tr(language, "week.unitExamples")}
                            />
                        </label>
                    </div>
                    <div className="button-row">
                        <button className="primary" type="button" onClick={handleAddTarget}>
                            {tr(language, "common.add")}
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setShowComposer(false);
                                setTargetDraft({ title: "", target: 1, unit: "" });
                            }}
                        >
                            {tr(language, "common.cancel")}
                        </button>
                    </div>
                </div>
            )}

            <div className="list sortable">
                {totalWeeklyTargets.length === 0 && <p className="empty">{tr(language, "week.noWeeklyTargets")}</p>}
                {totalWeeklyTargets.map((target, index) => {
                    const isEditingTarget = editingTargetId === target.id;
                    const isTouchDragActive = touchDraggingTargetId === target.id;
                    const isTouchDragOver = touchDragOverTargetId === target.id && !isTouchDragActive;
                    const autoDone = totalWeeklyDone(selectedWeek, target.id);
                    const manualAdjust = target.manualAdjust ?? 0;
                    const effectiveDone = Math.min(target.target, Math.max(0, autoDone + manualAdjust));

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
                                                <strong className="week-target-title">{target.title}</strong>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="week-target-controls">
                                    <div className="week-target-stepper">
                                        <button type="button" onClick={() => onAdjustWeeklyTarget(target.id, -1)}>
                                            –
                                        </button>
                                        <span className="muted week-target-done">{manualAdjust >= 0 ? `+${manualAdjust}` : manualAdjust}</span>
                                        <button type="button" onClick={() => onAdjustWeeklyTarget(target.id, 1)}>
                                            +
                                        </button>
                                    </div>
                                    <div className="week-target-actions">
                                        {isEditingTarget ? (
                                            <div className="week-edit-actions">
                                                <button className="primary" type="button" onClick={saveTargetEdit} disabled={!targetEditDraft.title.trim()}>
                                                    {tr(language, "common.save")}
                                                </button>
                                                <button type="button" onClick={cancelTargetEdit}>{tr(language, "common.cancel")}</button>
                                            </div>
                                        ) : (
                                            <button
                                                className="icon-btn week-edit-btn"
                                                type="button"
                                                onClick={() => startTargetEdit(target)}
                                                title={tr(language, "common.edit")}
                                                aria-label={tr(language, "common.edit")}
                                            >
                                                <Icon icon={Pencil} size={16} />
                                            </button>
                                        )}
                                        <button
                                            className="ghost-danger"
                                            type="button"
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
                                <ProgressBar value={effectiveDone} max={target.target} />
                            </div>
                            <div className="muted week-target-progress-simple">
                                {tr(language, "week.targetProgressSimple", {
                                    actual: effectiveDone,
                                    target: target.target,
                                    unit: target.unit ?? ""
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </>
    );
}
