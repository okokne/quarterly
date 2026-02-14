import { CSSProperties, Dispatch, SetStateAction, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Trash2, X } from "lucide-react";
import { DailyBlockDraft } from "../../hooks/useDailyBlocks";
import { useTouchBlockReorder } from "../../hooks/useTouchBlockReorder";
import { t as tr } from "../../i18n";
import { getBlockCompletionState } from "../../regressionLogic";
import { AppLanguage, DailyBlock, DailyTemplate, Id, TimeFormat, WeeklyTarget } from "../../types";
import { formatTime, toIsoDate } from "../../utils";
import { ToggleSwitch } from "../ToggleSwitch";
import { Icon } from "../ui/Icon";

type DayPlanViewMode = "list" | "timeline";
type TimelineZoomLevel = "compact" | "normal" | "large";

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
    onAddBlock: (date: string) => boolean | Promise<boolean>;
    onOpenTemplateModal: () => void;
    onLoadTemplate: (template: DailyTemplate) => void;
    onDeleteTemplate: (templateId: Id) => void;
    onUpdateBlock: (date: string, blockId: Id, changes: Partial<DailyBlock>) => void | Promise<void>;
    onDeleteBlock: (date: string, blockId: Id) => void | Promise<void>;
    dayPlanViewMode: DayPlanViewMode;
    setDayPlanViewMode: Dispatch<SetStateAction<DayPlanViewMode>>;
};

type TimelineBlock = {
    block: DailyBlock;
    startMinutes: number;
    endMinutes: number;
    top: number;
    height: number;
    displayStart: string;
    displayEnd: string;
    originalIndex: number;
};

const TIMELINE_START_HOUR = 6;
const TIMELINE_END_HOUR = 22;
const TIMELINE_DEFAULT_DURATION_MINUTES = 60;
const TIMELINE_BASE_MIN_VISIBLE_BLOCK_HEIGHT = 36;
const TIMELINE_BASE_PIXELS_PER_MINUTE = 1;
const TIMELINE_ZOOM_FACTOR: Record<TimelineZoomLevel, number> = {
    compact: 0.78,
    normal: 1,
    large: 1.24
};
const TIMELINE_ZOOM_LEVELS: TimelineZoomLevel[] = ["compact", "normal", "large"];

function parseTimeToMinutes(timeValue?: string): number | null {
    if (!timeValue) return null;
    const match = /^(\d{1,2}):(\d{2})$/.exec(timeValue.trim());
    if (!match) return null;
    const hours = Number.parseInt(match[1], 10);
    const minutes = Number.parseInt(match[2], 10);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
    return hours * 60 + minutes;
}

function minutesToTimeString(totalMinutes: number): string {
    const normalized = ((Math.round(totalMinutes) % 1440) + 1440) % 1440;
    const hours = Math.floor(normalized / 60);
    const minutes = normalized % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

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
    onDeleteBlock,
    dayPlanViewMode,
    setDayPlanViewMode
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

    const [timelineNow, setTimelineNow] = useState(() => new Date());
    const [isComposerOpen, setIsComposerOpen] = useState(false);
    const [timelineZoomLevel, setTimelineZoomLevel] = useState<TimelineZoomLevel>("normal");
    const timelineScrollRef = useRef<HTMLDivElement | null>(null);
    const timelineAutoScrollKeyRef = useRef("");

    const timelineStartAndEnd = useMemo(() => {
        let minStartMinutes = TIMELINE_START_HOUR * 60;
        let maxEndMinutes = TIMELINE_END_HOUR * 60;

        dayBlocks.forEach((block) => {
            const startMinutes = parseTimeToMinutes(block.startTime);
            if (startMinutes === null) return;

            const endMinutes = parseTimeToMinutes(block.endTime);
            const resolvedEnd = endMinutes !== null && endMinutes > startMinutes
                ? endMinutes
                : startMinutes + TIMELINE_DEFAULT_DURATION_MINUTES;

            minStartMinutes = Math.min(minStartMinutes, startMinutes);
            maxEndMinutes = Math.max(maxEndMinutes, resolvedEnd);
        });

        const startHour = Math.max(0, Math.floor(minStartMinutes / 60));
        const endHour = Math.min(24, Math.ceil(maxEndMinutes / 60));
        const safeEndHour = Math.max(endHour, startHour + 1);

        return {
            startHour,
            endHour: safeEndHour,
            startMinutes: startHour * 60,
            endMinutes: safeEndHour * 60
        };
    }, [dayBlocks]);

    const timelinePixelsPerMinute = TIMELINE_BASE_PIXELS_PER_MINUTE * TIMELINE_ZOOM_FACTOR[timelineZoomLevel];
    const timelineMinVisibleBlockHeight = TIMELINE_BASE_MIN_VISIBLE_BLOCK_HEIGHT * TIMELINE_ZOOM_FACTOR[timelineZoomLevel];
    const timelineHeight = (timelineStartAndEnd.endMinutes - timelineStartAndEnd.startMinutes) * timelinePixelsPerMinute;

    const timelineHours = useMemo(
        () => Array.from(
            { length: timelineStartAndEnd.endHour - timelineStartAndEnd.startHour + 1 },
            (_, index) => timelineStartAndEnd.startHour + index
        ),
        [timelineStartAndEnd.endHour, timelineStartAndEnd.startHour]
    );

    const targetTitleById = useMemo(() => {
        const byId = new Map<string, string>();
        selectedWeekTargets.forEach((target) => {
            byId.set(String(target.id), target.title);
        });
        return byId;
    }, [selectedWeekTargets]);

    const timelineBlocks = useMemo<TimelineBlock[]>(() => {
        return dayBlocks
            .map((block, originalIndex) => {
                const startMinutes = parseTimeToMinutes(block.startTime);
                if (startMinutes === null) return null;

                const endMinutes = parseTimeToMinutes(block.endTime);
                const resolvedEnd = endMinutes !== null ? endMinutes : startMinutes + TIMELINE_DEFAULT_DURATION_MINUTES;
                const resolvedDuration = resolvedEnd > startMinutes
                    ? resolvedEnd - startMinutes
                    : TIMELINE_DEFAULT_DURATION_MINUTES;

                const clippedStart = Math.max(startMinutes, timelineStartAndEnd.startMinutes);
                const clippedEnd = Math.min(startMinutes + resolvedDuration, timelineStartAndEnd.endMinutes);
                const clippedDuration = Math.max(20, clippedEnd - clippedStart);

                return {
                    block,
                    startMinutes,
                    endMinutes: startMinutes + resolvedDuration,
                    top: (clippedStart - timelineStartAndEnd.startMinutes) * timelinePixelsPerMinute,
                    height: Math.max(timelineMinVisibleBlockHeight, clippedDuration * timelinePixelsPerMinute),
                    displayStart: minutesToTimeString(startMinutes),
                    displayEnd: minutesToTimeString(startMinutes + resolvedDuration),
                    originalIndex
                };
            })
            .filter((item): item is TimelineBlock => item !== null)
            .sort((a, b) => a.startMinutes - b.startMinutes || a.originalIndex - b.originalIndex);
    }, [
        dayBlocks,
        timelineMinVisibleBlockHeight,
        timelinePixelsPerMinute,
        timelineStartAndEnd.endMinutes,
        timelineStartAndEnd.startMinutes
    ]);

    const untimedBlocks = useMemo(
        () => dayBlocks.filter((block) => parseTimeToMinutes(block.startTime) === null),
        [dayBlocks]
    );

    useEffect(() => {
        if (dayPlanViewMode !== "timeline") return;
        if (selectedDate !== toIsoDate(new Date())) return;

        const updateNow = () => setTimelineNow(new Date());
        updateNow();
        const intervalId = window.setInterval(updateNow, 60_000);
        return () => window.clearInterval(intervalId);
    }, [dayPlanViewMode, selectedDate]);

    useEffect(() => {
        setIsComposerOpen(false);
        if (dayPlanViewMode !== "timeline") {
            timelineAutoScrollKeyRef.current = "";
        }
    }, [dayPlanViewMode, selectedDate]);

    const handleToggleCompletion = useCallback((block: DailyBlock, checked: boolean) => {
        const { plannedAmount, usesCounter } = getBlockCompletionState({
            amount: block.amount,
            actual: block.actual,
            done: block.done
        });

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
    }, [onUpdateBlock, selectedDate]);

    const handleAddBlockSubmit = useCallback(async () => {
        const didAdd = await onAddBlock(selectedDate);
        if (didAdd) {
            setIsComposerOpen(false);
        }
    }, [onAddBlock, selectedDate]);

    const formatTimelineMarker = useCallback((hour: number) => {
        if (hour === 24) {
            return timeFormat === "24h" ? "24:00" : "12:00 AM";
        }
        return formatTime(`${String(hour).padStart(2, "0")}:00`, timeFormat);
    }, [timeFormat]);

    const openBlockInList = useCallback((blockId: Id) => {
        setDayPlanViewMode("list");
        window.setTimeout(() => {
            const target = document.querySelector<HTMLElement>(`[data-block-id="${String(blockId)}"]`);
            if (!target) return;
            target.scrollIntoView({ behavior: "smooth", block: "center" });
            target.classList.add("today-block-focus");
            window.setTimeout(() => target.classList.remove("today-block-focus"), 1200);
        }, 120);
    }, [setDayPlanViewMode]);

    const isTodaySelected = selectedDate === toIsoDate(timelineNow);
    const currentMinutes = timelineNow.getHours() * 60 + timelineNow.getMinutes();
    const showCurrentTimeLine = dayPlanViewMode === "timeline"
        && isTodaySelected
        && currentMinutes >= timelineStartAndEnd.startMinutes
        && currentMinutes <= timelineStartAndEnd.endMinutes;
    const currentTimeLineTop = (currentMinutes - timelineStartAndEnd.startMinutes) * timelinePixelsPerMinute;

    useEffect(() => {
        if (dayPlanViewMode !== "timeline") return;

        const scrollContainer = timelineScrollRef.current;
        if (!scrollContainer) return;

        const firstTimedStartMinutes = timelineBlocks[0]?.startMinutes ?? null;
        const autoScrollKey = `${selectedDate}|${timelineZoomLevel}|${timelineStartAndEnd.startMinutes}|${timelineStartAndEnd.endMinutes}|${firstTimedStartMinutes ?? "none"}`;
        if (timelineAutoScrollKeyRef.current === autoScrollKey) return;
        timelineAutoScrollKeyRef.current = autoScrollKey;

        const now = new Date();
        const isCurrentDay = selectedDate === toIsoDate(now);
        const targetMinutes = isCurrentDay
            ? now.getHours() * 60 + now.getMinutes()
            : firstTimedStartMinutes ?? timelineStartAndEnd.startMinutes;
        const clampedTarget = Math.min(Math.max(targetMinutes, timelineStartAndEnd.startMinutes), timelineStartAndEnd.endMinutes);
        const targetTop = Math.max(0, (clampedTarget - timelineStartAndEnd.startMinutes) * timelinePixelsPerMinute - 120);

        window.requestAnimationFrame(() => {
            scrollContainer.scrollTo({ top: targetTop, behavior: "smooth" });
        });
    }, [
        dayPlanViewMode,
        selectedDate,
        timelineBlocks,
        timelinePixelsPerMinute,
        timelineStartAndEnd.endMinutes,
        timelineStartAndEnd.startMinutes,
        timelineZoomLevel
    ]);

    return (
        <div className="subcard">
            <div className="today-dayplan-header">
                <h3>{tr(language, "today.dayPlan")}</h3>
                <div className="today-dayplan-header-actions">
                    {dayPlanViewMode === "timeline" && (
                        <div className="today-timeline-zoom-controls" role="group" aria-label={tr(language, "today.timelineZoom")}>
                            {TIMELINE_ZOOM_LEVELS.map((zoomLevel) => (
                                <button
                                    key={zoomLevel}
                                    type="button"
                                    className={timelineZoomLevel === zoomLevel ? "active" : ""}
                                    onClick={() => setTimelineZoomLevel(zoomLevel)}
                                >
                                    {tr(language, `today.timelineZoom.${zoomLevel}`)}
                                </button>
                            ))}
                        </div>
                    )}
                    <button
                        type="button"
                        className={`primary today-dayplan-add-btn ${isComposerOpen ? "open" : ""}`}
                        onClick={() => setIsComposerOpen((prev) => !prev)}
                        title={isComposerOpen ? tr(language, "common.close") : tr(language, "today.blockAdd")}
                        aria-label={isComposerOpen ? tr(language, "common.close") : tr(language, "today.blockAdd")}
                    >
                        <span className="today-dayplan-add-icon" aria-hidden="true">+</span>
                    </button>
                </div>
            </div>

            {isComposerOpen && (
                <>
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
                    <div className="button-row today-dayplan-composer-actions">
                        <button className="primary" onClick={handleAddBlockSubmit}>{tr(language, "today.blockAdd")}</button>
                        <button type="button" onClick={() => setIsComposerOpen(false)}>
                            {tr(language, "common.cancel")}
                        </button>
                        {dayPlanViewMode === "list" && dayBlocks.length > 0 && (
                            <button onClick={onOpenTemplateModal}>{tr(language, "today.saveAsTemplate")}</button>
                        )}
                    </div>
                </>
            )}

            {templates.length > 0 && dayPlanViewMode === "list" && (
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
                                    <button onClick={() => onDeleteTemplate(template.id)} aria-label={tr(language, "common.delete")} title={tr(language, "common.delete")}>
                                        <Icon icon={Trash2} size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {dayPlanViewMode === "list" && (
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
                                            <Icon icon={X} size={14} />
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
                                            onChange={(checked) => handleToggleCompletion(block, checked)}
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
            )}

            {dayPlanViewMode === "timeline" && (
                <div className={`today-timeline-layout zoom-${timelineZoomLevel}`}>
                    {dayBlocks.length === 0 ? (
                        <p className="empty">{tr(language, "today.noBlocks")}</p>
                    ) : (
                        <>
                            <div className="today-timeline-shell">
                                <div ref={timelineScrollRef} className="today-timeline-scroll">
                                    <div className="today-timeline-grid" style={{ height: `${timelineHeight}px` }}>
                                        <div className="today-timeline-scale">
                                            {timelineHours.map((hour) => {
                                                const top = (hour * 60 - timelineStartAndEnd.startMinutes) * timelinePixelsPerMinute;
                                                return (
                                                    <div key={`scale-${hour}`} className="today-timeline-hour-marker" style={{ top: `${top}px` } as CSSProperties}>
                                                        {formatTimelineMarker(hour)}
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        <div className="today-timeline-lane">
                                            {timelineHours.map((hour) => {
                                                const top = (hour * 60 - timelineStartAndEnd.startMinutes) * timelinePixelsPerMinute;
                                                return <div key={`line-${hour}`} className="today-timeline-hour-line" style={{ top: `${top}px` } as CSSProperties} />;
                                            })}

                                            {showCurrentTimeLine && (
                                                <div className="today-timeline-now-line" style={{ top: `${currentTimeLineTop}px` } as CSSProperties} />
                                            )}

                                            {timelineBlocks.map((entry) => {
                                                const {
                                                    plannedAmount,
                                                    usesCounter,
                                                    actualValue,
                                                    isDone
                                                } = getBlockCompletionState({
                                                    amount: entry.block.amount,
                                                    actual: entry.block.actual,
                                                    done: entry.block.done
                                                });
                                                const linkedTargetTitle = entry.block.linkedTargetId
                                                    ? targetTitleById.get(String(entry.block.linkedTargetId)) ?? tr(language, "week.weeklyTarget")
                                                    : null;
                                                return (
                                                    <button
                                                        key={entry.block.id}
                                                        type="button"
                                                        className={`today-timeline-block ${isDone ? "done" : ""} ${linkedTargetTitle ? "has-target" : ""}`}
                                                        style={{ top: `${entry.top}px`, height: `${entry.height}px` } as CSSProperties}
                                                        onClick={() => openBlockInList(entry.block.id)}
                                                    >
                                                        <div className="today-timeline-block-head">
                                                            <strong>{entry.block.title}</strong>
                                                            <span>{formatTime(entry.displayStart, timeFormat)}–{formatTime(entry.displayEnd, timeFormat)}</span>
                                                        </div>
                                                        <div className="today-timeline-block-meta">
                                                            {linkedTargetTitle && (
                                                                <span className="today-timeline-badge today-timeline-badge-target" title={linkedTargetTitle}>
                                                                    {linkedTargetTitle}
                                                                </span>
                                                            )}
                                                            {usesCounter && (
                                                                <span className="today-timeline-badge today-timeline-badge-count" title={`${actualValue}/${plannedAmount}`}>
                                                                    {actualValue}/{plannedAmount}
                                                                </span>
                                                            )}
                                                            {isDone && (
                                                                <span
                                                                    className="today-timeline-done-indicator"
                                                                    title={tr(language, "today.completedStatus")}
                                                                    aria-label={tr(language, "today.completedStatus")}
                                                                >
                                                                    <Icon icon={Check} size={12} />
                                                                </span>
                                                            )}
                                                        </div>
                                                    </button>
                                                );
                                            })}

                                            {timelineBlocks.length === 0 && (
                                                <div className="today-timeline-empty">{tr(language, "today.noTimedBlocks")}</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {untimedBlocks.length > 0 && (
                                <div className="today-untimed-section">
                                    <h4>{tr(language, "today.untimedBlocks")}</h4>
                                    <div className="today-untimed-list">
                                        {untimedBlocks.map((block) => {
                                            const {
                                                plannedAmount,
                                                usesCounter,
                                                actualValue,
                                                isDone
                                            } = getBlockCompletionState({
                                                amount: block.amount,
                                                actual: block.actual,
                                                done: block.done
                                            });
                                            const linkedTargetTitle = block.linkedTargetId
                                                ? targetTitleById.get(String(block.linkedTargetId)) ?? tr(language, "week.weeklyTarget")
                                                : null;
                                            return (
                                                <button
                                                    key={block.id}
                                                    type="button"
                                                    className={`today-untimed-item ${isDone ? "done" : ""} ${linkedTargetTitle ? "has-target" : ""}`}
                                                    onClick={() => openBlockInList(block.id)}
                                                >
                                                    <div className="today-untimed-content">
                                                        <strong>{block.title}</strong>
                                                        <span className="muted">{tr(language, "today.untimedHint")}</span>
                                                        <div className="today-timeline-block-meta">
                                                            {linkedTargetTitle && (
                                                                <span className="today-timeline-badge today-timeline-badge-target" title={linkedTargetTitle}>
                                                                    {linkedTargetTitle}
                                                                </span>
                                                            )}
                                                            {usesCounter && (
                                                                <span className="today-timeline-badge today-timeline-badge-count" title={`${actualValue}/${plannedAmount}`}>
                                                                    {actualValue}/{plannedAmount}
                                                                </span>
                                                            )}
                                                            {isDone && (
                                                                <span
                                                                    className="today-timeline-done-indicator"
                                                                    title={tr(language, "today.completedStatus")}
                                                                    aria-label={tr(language, "today.completedStatus")}
                                                                >
                                                                    <Icon icon={Check} size={12} />
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
