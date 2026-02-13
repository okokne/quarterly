import { Dispatch, SetStateAction } from "react";
import { DailyBlockDraft } from "../../hooks/useDailyBlocks";
import { useTouchBlockReorder } from "../../hooks/useTouchBlockReorder";
import { t as tr } from "../../i18n";
import { getBlockCompletionState } from "../../regressionLogic";
import { AppLanguage, DailyBlock, DailyTemplate, Id, TimeFormat, WeeklyTarget } from "../../types";
import { formatTime } from "../../utils";
import { ToggleSwitch } from "../ToggleSwitch";

type TodayBlocksSectionProps = {
    language: AppLanguage;
    timeFormat: TimeFormat;
    isArchiveView: boolean;
    selectedDate: string;
    selectedWeekTargets: WeeklyTarget[];
    blockDraft: DailyBlockDraft;
    setBlockDraft: Dispatch<SetStateAction<DailyBlockDraft>>;
    dayBlocks: DailyBlock[];
    templates: DailyTemplate[];
    draggingBlockId: Id | null;
    setDraggingBlockId: Dispatch<SetStateAction<Id | null>>;
    onReorderBlocks: (date: string, fromIndex: number, toIndex: number) => void;
    onAddBlock: (date: string) => void | Promise<void>;
    onOpenTemplateModal: () => void;
    onLoadTemplate: (template: DailyTemplate) => void;
    onDeleteTemplate: (templateId: Id) => void;
    onUpdateBlock: (date: string, blockId: Id, changes: Partial<DailyBlock>) => void | Promise<void>;
    onDeleteBlock: (date: string, blockId: Id) => void | Promise<void>;
};

export function TodayBlocksSection({
    language,
    timeFormat,
    isArchiveView,
    selectedDate,
    selectedWeekTargets,
    blockDraft,
    setBlockDraft,
    dayBlocks,
    templates,
    draggingBlockId,
    setDraggingBlockId,
    onReorderBlocks,
    onAddBlock,
    onOpenTemplateModal,
    onLoadTemplate,
    onDeleteTemplate,
    onUpdateBlock,
    onDeleteBlock
}: TodayBlocksSectionProps) {
    const {
        touchDraggingBlockId,
        touchDragOverBlockId,
        startTouchReorder
    } = useTouchBlockReorder({
        isArchiveView,
        dayBlocks,
        selectedDate,
        onReorderBlocks
    });

    return (
        <div className="subcard">
            <h3>{tr(language, "today.dayPlan")}</h3>
            <div className="grid">
                <label>
                    {tr(language, "common.start")}
                    <input type="time" value={blockDraft.startTime} onChange={(e) => setBlockDraft({ ...blockDraft, startTime: e.target.value })} />
                </label>
                <label>
                    {tr(language, "common.end")}
                    <input type="time" value={blockDraft.endTime} onChange={(e) => setBlockDraft({ ...blockDraft, endTime: e.target.value })} />
                </label>
                <label>
                    {tr(language, "common.title")}
                    <input value={blockDraft.title} onChange={(e) => setBlockDraft({ ...blockDraft, title: e.target.value })} placeholder={tr(language, "today.blockPlaceholder")} />
                </label>
                <label>
                    {tr(language, "today.weeklyTargetOptional")}
                    <select
                        value={blockDraft.linkedTargetId}
                        onChange={(e) => setBlockDraft({ ...blockDraft, linkedTargetId: e.target.value })}
                    >
                        <option value="">{tr(language, "common.none")}</option>
                        {selectedWeekTargets.map((target) => (
                            <option key={target.id} value={target.id}>{target.title}</option>
                        ))}
                    </select>
                </label>
                <label>
                    {tr(language, "today.plannedAmountOptional")}
                    <input
                        type="number"
                        min={1}
                        value={blockDraft.amount}
                        onChange={(e) => setBlockDraft({ ...blockDraft, amount: Number(e.target.value) })}
                    />
                </label>
            </div>
            <div className="button-row">
                <button className="primary" onClick={() => onAddBlock(selectedDate)}>{tr(language, "today.blockAdd")}</button>
                {dayBlocks.length > 0 && (
                    <button onClick={onOpenTemplateModal}>{tr(language, "today.saveAsTemplate")}</button>
                )}
            </div>

            {templates.length > 0 && (
                <div className="subcard template-section">
                    <h4>{tr(language, "today.templates")}</h4>
                    <div className="template-list">
                        {templates.map((template) => (
                            <div key={template.id} className="template-item">
                                <div>
                                    <strong>{template.name}</strong>
                                    <span className="muted"> · {tr(language, "today.blocksCount", { count: template.blocks.length })}</span>
                                </div>
                                <div className="button-row compact">
                                    <button onClick={() => onLoadTemplate(template)}>{tr(language, "common.load")}</button>
                                    <button onClick={() => onDeleteTemplate(template.id)}>🗑</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="list sortable">
                {dayBlocks.length === 0 && <p className="empty">{tr(language, "today.noBlocks")}</p>}
                {dayBlocks.map((block, index) => {
                    const {
                        plannedAmount,
                        usesCounter,
                        actualValue,
                        sliderValue,
                        isDone
                    } = getBlockCompletionState({
                        amount: block.amount,
                        actual: block.actual,
                        done: block.done
                    });
                    const sliderPercent = plannedAmount > 0 ? (sliderValue / plannedAmount) * 100 : 0;
                    const isTouchDragActive = touchDraggingBlockId === block.id;
                    const isTouchDragOver = touchDragOverBlockId === block.id && !isTouchDragActive;

                    return (
                        <div
                            key={block.id}
                            className={`list-item ${isDone ? "done" : ""} ${draggingBlockId === block.id ? "dragging" : ""} ${isTouchDragActive ? "touch-drag-active" : ""} ${isTouchDragOver ? "touch-drag-over" : ""}`}
                            data-block-id={String(block.id)}
                            data-block-index={index}
                            onDragOver={(e) => {
                                if (isArchiveView) return;
                                e.preventDefault();
                                e.dataTransfer.dropEffect = "move";
                            }}
                            onDrop={() => {
                                if (isArchiveView) return;
                                if (draggingBlockId && draggingBlockId !== block.id) {
                                    const fromIdx = dayBlocks.findIndex((item) => item.id === draggingBlockId);
                                    if (fromIdx >= 0) {
                                        onReorderBlocks(selectedDate, fromIdx, index);
                                    }
                                }
                                setDraggingBlockId(null);
                            }}
                        >
                            <div
                                className="drag-handle"
                                draggable={!isArchiveView}
                                onPointerDown={(e) => startTouchReorder(e, block.id, index)}
                                onDragStart={(e) => {
                                    if (isArchiveView) {
                                        e.preventDefault();
                                        return;
                                    }

                                    setDraggingBlockId(block.id);
                                    e.dataTransfer.effectAllowed = "move";
                                    const row = e.currentTarget.parentElement;
                                    if (row) {
                                        e.dataTransfer.setDragImage(row, 0, 0);
                                    }
                                }}
                                onDragEnd={() => setDraggingBlockId(null)}
                            >
                                ⋮⋮
                            </div>
                            <div className="block-content">
                                <div className="block-title-row">
                                    <strong className="block-title">{formatTime(block.startTime, timeFormat)}–{formatTime(block.endTime, timeFormat)} · {block.title}</strong>
                                    <button
                                        data-no-drag="true"
                                        className="block-delete-x"
                                        title={tr(language, "common.delete")}
                                        aria-label={tr(language, "common.delete")}
                                        onPointerDown={(e) => e.stopPropagation()}
                                        onMouseDown={(e) => e.stopPropagation()}
                                        onClick={() => onDeleteBlock(selectedDate, block.id)}
                                    >
                                        ✕
                                    </button>
                                </div>

                                <div
                                    className="toggle-row"
                                    data-no-drag="true"
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onTouchStart={(e) => e.stopPropagation()}
                                >
                                    <span className="toggle-label">{tr(language, "today.markLabel")}</span>
                                    <span className={`toggle-status ${isDone ? "done" : "pending"}`}>
                                        {isDone ? tr(language, "today.completedStatus") : tr(language, "today.pendingStatus")}
                                    </span>
                                    <ToggleSwitch
                                        checked={isDone}
                                        ariaLabel={tr(language, "today.markLabel")}
                                        onChange={(checked) => {
                                            const nextActual = usesCounter
                                                ? checked
                                                    ? plannedAmount
                                                    : 0
                                                : checked
                                                    ? 1
                                                    : 0;
                                            onUpdateBlock(selectedDate, block.id, {
                                                done: checked,
                                                actual: nextActual
                                            });
                                        }}
                                    />
                                </div>

                                {block.linkedTargetId && (
                                    <div className="block-meta-row">
                                        <div className="muted block-link">
                                            {tr(language, "today.linked", { target: selectedWeekTargets.find((target) => target.id === block.linkedTargetId)?.title ?? tr(language, "week.weeklyTarget") })}
                                        </div>
                                    </div>
                                )}

                                {usesCounter && (
                                    <div className="block-progress-row">
                                        <div
                                            className="block-counter block-counter-shell"
                                            data-no-drag="true"
                                            onPointerDown={(e) => e.stopPropagation()}
                                            onMouseDown={(e) => e.stopPropagation()}
                                            onTouchStart={(e) => e.stopPropagation()}
                                        >
                                            <input
                                                className="block-counter-range"
                                                type="range"
                                                min={0}
                                                max={plannedAmount}
                                                value={sliderValue}
                                                style={{
                                                    background: `linear-gradient(to right, var(--accent) ${sliderPercent}%, var(--border) ${sliderPercent}%)`
                                                }}
                                                draggable={false}
                                                onMouseDown={(e) => e.stopPropagation()}
                                                onTouchStart={(e) => e.stopPropagation()}
                                                onClick={(e) => e.stopPropagation()}
                                                onKeyDown={(e) => e.stopPropagation()}
                                                onChange={(e) => {
                                                    const nextActual = Math.min(Math.max(Number(e.target.value), 0), plannedAmount);
                                                    onUpdateBlock(selectedDate, block.id, {
                                                        actual: nextActual,
                                                        done: nextActual >= plannedAmount
                                                    });
                                                }}
                                            />
                                            <span className="block-counter-value">{actualValue}/{plannedAmount}</span>
                                            <input
                                                className="block-counter-input"
                                                type="number"
                                                min={0}
                                                max={plannedAmount}
                                                step={1}
                                                inputMode="numeric"
                                                value={actualValue}
                                                draggable={false}
                                                onMouseDown={(e) => e.stopPropagation()}
                                                onTouchStart={(e) => e.stopPropagation()}
                                                onClick={(e) => e.stopPropagation()}
                                                onKeyDown={(e) => e.stopPropagation()}
                                                onFocus={(e) => e.currentTarget.select()}
                                                onChange={(e) => {
                                                    const raw = e.target.value.trim();
                                                    if (raw === "") {
                                                        onUpdateBlock(selectedDate, block.id, { actual: 0, done: false });
                                                        return;
                                                    }

                                                    const parsed = Number.parseInt(raw, 10);
                                                    if (Number.isNaN(parsed)) return;
                                                    const nextActual = Math.min(Math.max(0, parsed), plannedAmount);

                                                    onUpdateBlock(selectedDate, block.id, {
                                                        actual: nextActual,
                                                        done: nextActual >= plannedAmount
                                                    });
                                                }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
