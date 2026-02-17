import { CSSProperties, Dispatch, SetStateAction, useEffect, useMemo, useRef, useState } from "react";
import { Check, Pencil } from "../ui/icons";
import { useTouchTargetReorder } from "../../hooks/useTouchTargetReorder";
import { t as tr } from "../../i18n";
import { AppLanguage, Cycle, Id, WeeklyTarget } from "../../types";
import {
    buildGoalAccentMap,
    buildWeeklyTargetAccentMap,
    DEFAULT_WEEKLY_TARGET_ACCENT,
    normalizeWeeklyTargetAccent,
    WEEKLY_TARGET_ACCENT_PALETTE
} from "../../utils/weeklyTargetAccents";
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
    focusTargetId: Id | null;
    onFocusHandled: () => void;
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
    setEditingTargetId,
    focusTargetId,
    onFocusHandled
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
    const [highlightedTargetId, setHighlightedTargetId] = useState<Id | null>(null);
    const highlightTimeoutRef = useRef<number | null>(null);
    const goalAccentById = useMemo(
        () => buildGoalAccentMap(cycle.goals),
        [cycle.goals]
    );
    const goalTitleById = useMemo(
        () => new Map(cycle.goals.map((goal) => [String(goal.id), goal.title])),
        [cycle.goals]
    );
    const linkedComposerGoalAccent = targetDraft.goalId ? goalAccentById.get(targetDraft.goalId) : undefined;
    const linkedComposerColor = linkedComposerGoalAccent ?? normalizeWeeklyTargetAccent(targetDraft.color) ?? DEFAULT_WEEKLY_TARGET_ACCENT;
    const targetAccentById = useMemo(
        () => buildWeeklyTargetAccentMap(totalWeeklyTargets, cycle.goals),
        [cycle.goals, totalWeeklyTargets]
    );

    const handleAddTarget = () => {
        const didAdd = onAddWeeklyTarget();
        if (!didAdd) return;
        setShowComposer(false);
    };

    useEffect(() => {
        return () => {
            if (highlightTimeoutRef.current !== null) {
                window.clearTimeout(highlightTimeoutRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (!focusTargetId) return;

        const targetRow = document.getElementById(`week-target-${String(focusTargetId)}`);
        if (targetRow) {
            targetRow.scrollIntoView({ behavior: "smooth", block: "center" });
            setHighlightedTargetId(focusTargetId);

            if (highlightTimeoutRef.current !== null) {
                window.clearTimeout(highlightTimeoutRef.current);
            }
            highlightTimeoutRef.current = window.setTimeout(() => {
                setHighlightedTargetId((prev) => (prev === focusTargetId ? null : prev));
                highlightTimeoutRef.current = null;
            }, 1800);
        }

        onFocusHandled();
    }, [focusTargetId, onFocusHandled, selectedWeek, totalWeeklyTargets]);

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
                        <label>
                            {tr(language, "week.mainGoalOptional")}
                            <select
                                value={targetDraft.goalId}
                                onChange={(e) => {
                                    const nextGoalId = e.target.value;
                                    const linkedGoalAccent = nextGoalId ? goalAccentById.get(nextGoalId) : undefined;
                                    setTargetDraft({
                                        ...targetDraft,
                                        goalId: nextGoalId,
                                        color: linkedGoalAccent ?? targetDraft.color
                                    });
                                }}
                            >
                                <option value="">{tr(language, "week.mainGoalNone")}</option>
                                {cycle.goals.map((goal) => (
                                    <option key={goal.id} value={goal.id}>
                                        {goal.title}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>
                    <div className="week-target-color-picker">
                        <span className="week-target-color-picker-label">{tr(language, "week.targetColor")}</span>
                        {targetDraft.goalId && (
                            <span className="week-target-color-link-hint">
                                {tr(language, "week.targetColorFromGoal")}
                            </span>
                        )}
                        <div className="week-target-color-grid" role="radiogroup" aria-label={tr(language, "week.targetColor")}>
                            {WEEKLY_TARGET_ACCENT_PALETTE.map((color, index) => {
                                const selectedColor = linkedComposerColor;
                                const isSelected = selectedColor === color;
                                return (
                                    <button
                                        key={color}
                                        type="button"
                                        role="radio"
                                        aria-checked={isSelected}
                                        className={`week-target-color-swatch ${isSelected ? "selected" : ""}`}
                                        style={{ "--week-target-accent": color } as CSSProperties}
                                        onClick={() => {
                                            if (targetDraft.goalId) return;
                                            setTargetDraft({ ...targetDraft, color });
                                        }}
                                        disabled={Boolean(targetDraft.goalId)}
                                        title={`${tr(language, "week.targetColor")} ${index + 1}`}
                                    >
                                        {isSelected && <Icon icon={Check} size={13} />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    <div className="button-row">
                        <button className="primary" type="button" onClick={handleAddTarget}>
                            {tr(language, "common.add")}
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setShowComposer(false);
                                setTargetDraft({
                                    title: "",
                                    target: 1,
                                    unit: "",
                                    color: DEFAULT_WEEKLY_TARGET_ACCENT,
                                    goalId: ""
                                });
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
                    const targetAccent = targetAccentById.get(String(target.id)) ?? DEFAULT_WEEKLY_TARGET_ACCENT;
                    const linkedGoalTitle = target.goalId ? goalTitleById.get(String(target.goalId)) : undefined;
                    const linkedEditGoalAccent = targetEditDraft.goalId ? goalAccentById.get(targetEditDraft.goalId) : undefined;
                    const selectedEditColor = linkedEditGoalAccent ?? normalizeWeeklyTargetAccent(targetEditDraft.color) ?? DEFAULT_WEEKLY_TARGET_ACCENT;

                    return (
                        <div
                            key={target.id}
                            id={`week-target-${target.id}`}
                            className={`list-item column week-target-item planner-block-card has-target-accent ${draggingTargetId === target.id ? "dragging" : ""} ${isEditingTarget ? "editing" : ""} ${isTouchDragActive ? "touch-drag-active" : ""} ${isTouchDragOver ? "touch-drag-over" : ""} ${highlightedTargetId === target.id ? "focus-highlight" : ""}`}
                            data-target-index={index}
                            style={{
                                "--planner-target-accent": targetAccent,
                                "--week-target-accent": targetAccent
                            } as CSSProperties}
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
                                                    <select
                                                        value={targetEditDraft.goalId}
                                                        onChange={(e) => {
                                                            const nextGoalId = e.target.value;
                                                            const linkedGoalAccent = nextGoalId ? goalAccentById.get(nextGoalId) : undefined;
                                                            setTargetEditDraft((prev) => ({
                                                                ...prev,
                                                                goalId: nextGoalId,
                                                                color: linkedGoalAccent ?? prev.color
                                                            }));
                                                        }}
                                                    >
                                                        <option value="">{tr(language, "week.mainGoalNone")}</option>
                                                        {cycle.goals.map((goal) => (
                                                            <option key={`${target.id}-${goal.id}`} value={goal.id}>
                                                                {goal.title}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <div className="week-target-edit-color-row">
                                                        <span className="week-target-color-picker-label">{tr(language, "week.targetColor")}</span>
                                                        {targetEditDraft.goalId && (
                                                            <span className="week-target-color-link-hint">
                                                                {tr(language, "week.targetColorFromGoal")}
                                                            </span>
                                                        )}
                                                        <div className="week-target-color-grid" role="radiogroup" aria-label={tr(language, "week.targetColor")}>
                                                            {WEEKLY_TARGET_ACCENT_PALETTE.map((color, colorIndex) => {
                                                                const isSelected = selectedEditColor === color;
                                                                return (
                                                                    <button
                                                                        key={color}
                                                                        type="button"
                                                                        role="radio"
                                                                        aria-checked={isSelected}
                                                                        className={`week-target-color-swatch ${isSelected ? "selected" : ""}`}
                                                                        style={{ "--week-target-accent": color } as CSSProperties}
                                                                        onClick={() => {
                                                                            if (targetEditDraft.goalId) return;
                                                                            setTargetEditDraft((prev) => ({ ...prev, color }));
                                                                        }}
                                                                        disabled={Boolean(targetEditDraft.goalId)}
                                                                        title={`${tr(language, "week.targetColor")} ${colorIndex + 1}`}
                                                                    >
                                                                        {isSelected && <Icon icon={Check} size={13} />}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <strong className="week-target-title">{target.title}</strong>
                                                    {linkedGoalTitle && (
                                                        <span className="planner-meta-chip week-target-goal-chip">
                                                            {tr(language, "week.linkedGoalPrefix", { goal: linkedGoalTitle })}
                                                        </span>
                                                    )}
                                                </>
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
