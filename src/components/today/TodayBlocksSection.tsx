import { CSSProperties, Dispatch, SetStateAction, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { CalendarDays, Check, PencilLine, Plus, Trash2, X } from "../ui/icons";
import { DailyBlockDraft } from "../../hooks/useDailyBlocks";
import { useTouchBlockReorder } from "../../hooks/useTouchBlockReorder";
import { t as tr } from "../../i18n";
import { getBlockCompletionState } from "../../regressionLogic";
import { AppLanguage, DailyBlock, DailyTemplate, Goal, Id, TimeFormat, WeeklyTarget } from "../../types";
import { formatTime, toIsoDate } from "../../utils";
import { buildWeeklyTargetAccentMap, DEFAULT_WEEKLY_TARGET_ACCENT } from "../../utils/weeklyTargetAccents";
import { ToggleSwitch } from "../ToggleSwitch";
import { Icon } from "../ui/Icon";

type DayPlanViewMode = "list" | "timeline";
type TimelineZoomLevel = "compact" | "normal" | "large";

type TodayBlocksSectionProps = {
    language: AppLanguage;
    timeFormat: TimeFormat;
    isArchiveView: boolean;
    selectedDate: string;
    selectedWeek: number;
    goals: Goal[];
    selectedWeekTargets: WeeklyTarget[];
    blockDraft: DailyBlockDraft;
    setBlockDraft: Dispatch<SetStateAction<DailyBlockDraft>>;
    dayBlocks: DailyBlock[];
    templates: DailyTemplate[];
    draggingBlockId: Id | null;
    setDraggingBlockId: Dispatch<SetStateAction<Id | null>>;
    onReorderBlocks: (date: string, fromIndex: number, toIndex: number) => void;
    onAddBlock: (date: string, draftOverride?: DailyBlockDraft) => boolean | Promise<boolean>;
    onOpenTemplateModal: () => void;
    onLoadTemplate: (template: DailyTemplate) => void;
    onDeleteTemplate: (templateId: Id) => void;
    onUpdateBlock: (date: string, blockId: Id, changes: Partial<DailyBlock>) => void | Promise<void>;
    onDeleteBlock: (date: string, blockId: Id) => void | Promise<void>;
    getWeeklyRemaining: (weekIndex: number) => Array<WeeklyTarget & { remaining: number }>;
    dayPlanViewMode: DayPlanViewMode;
    setDayPlanViewMode: Dispatch<SetStateAction<DayPlanViewMode>>;
    composerRequest: { id: number; mode: "timed" | "flexible" } | null;
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

type BlockEditDraft = {
    startTime: string;
    endTime: string;
    isFlexible: boolean;
    title: string;
    linkedTargetId: string;
    amount: string;
};

type BlockWithIndex = {
    block: DailyBlock;
    originalIndex: number;
};

const TIMELINE_START_HOUR = 6;
const TIMELINE_END_HOUR = 22;
const TIMELINE_DEFAULT_DURATION_MINUTES = 60;
const COMPLETION_DRAG_THRESHOLD = 0.6;
const COMPLETION_FX_DURATION_MS = 850;
const TIMELINE_PIXELS_PER_HOUR_BY_ZOOM: Record<TimelineZoomLevel, number> = {
    compact: 28,
    normal: 56,
    large: 96
};
const TIMELINE_MIN_VISIBLE_BLOCK_HEIGHT_BY_ZOOM: Record<TimelineZoomLevel, number> = {
    compact: 18,
    normal: 30,
    large: 44
};
const TIMELINE_ZOOM_LEVELS: TimelineZoomLevel[] = ["compact", "normal", "large"];

function parseTimeToMinutes(timeValue?: string | null): number | null {
    if (!timeValue) return null;
    const match = /^(\d{1,2}):(\d{2})$/.exec(timeValue.trim());
    if (!match) return null;
    const hours = Number.parseInt(match[1], 10);
    const minutes = Number.parseInt(match[2], 10);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
    return hours * 60 + minutes;
}

function isFlexibleBlock(block: Pick<DailyBlock, "isFlexible" | "startTime" | "endTime">): boolean {
    return block.isFlexible === true || !block.startTime || !block.endTime;
}

function minutesToTimeString(totalMinutes: number): string {
    const normalized = ((Math.round(totalMinutes) % 1440) + 1440) % 1440;
    const hours = Math.floor(normalized / 60);
    const minutes = normalized % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function getNextRoundedTimeRange(): { startTime: string; endTime: string } {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const nextQuarterHour = (Math.floor(currentMinutes / 15) + 1) * 15;
    return {
        startTime: minutesToTimeString(nextQuarterHour),
        endTime: minutesToTimeString(nextQuarterHour + TIMELINE_DEFAULT_DURATION_MINUTES)
    };
}

function createBlockEditDraft(block: DailyBlock): BlockEditDraft {
    const flexible = isFlexibleBlock(block);
    return {
        startTime: block.startTime ?? "",
        endTime: block.endTime ?? "",
        isFlexible: flexible,
        title: block.title,
        linkedTargetId: block.linkedTargetId ? String(block.linkedTargetId) : "",
        amount: typeof block.amount === "number" && Number.isFinite(block.amount) && block.amount > 0
            ? String(Math.floor(block.amount))
            : ""
    };
}

export function TodayBlocksSection({
    language,
    timeFormat,
    isArchiveView,
    selectedDate,
    selectedWeek,
    goals,
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
    getWeeklyRemaining,
    dayPlanViewMode,
    setDayPlanViewMode,
    composerRequest
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
    const [isTemplatePickerOpen, setIsTemplatePickerOpen] = useState(false);
    const [editingBlockId, setEditingBlockId] = useState<Id | null>(null);
    const [editingDraft, setEditingDraft] = useState<BlockEditDraft | null>(null);
    const [timelineZoomLevel, setTimelineZoomLevel] = useState<TimelineZoomLevel>("normal");
    const [completionDragState, setCompletionDragState] = useState<{ blockId: Id; progress: number } | null>(null);
    const [completionFxById, setCompletionFxById] = useState<Record<string, true>>({});
    const timelineScrollRef = useRef<HTMLDivElement | null>(null);
    const timelineAutoScrollKeyRef = useRef("");
    const completionDragSessionRef = useRef<{
        blockId: Id;
        pointerId: number;
        startX: number;
        travelPx: number;
        initialProgress: number;
        progress: number;
        didDrag: boolean;
        committed: boolean;
        nextDoneState: boolean;
    } | null>(null);
    const completionFxTimeoutRef = useRef<Map<string, number>>(new Map());
    const handledComposerRequestIdRef = useRef<number | null>(null);

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

    const timelinePixelsPerMinute = TIMELINE_PIXELS_PER_HOUR_BY_ZOOM[timelineZoomLevel] / 60;
    const timelineMinVisibleBlockHeight = TIMELINE_MIN_VISIBLE_BLOCK_HEIGHT_BY_ZOOM[timelineZoomLevel];
    const timelineHeight = (timelineStartAndEnd.endMinutes - timelineStartAndEnd.startMinutes) * timelinePixelsPerMinute;

    const timelineHours = useMemo(
        () => Array.from(
            { length: timelineStartAndEnd.endHour - timelineStartAndEnd.startHour + 1 },
            (_, index) => timelineStartAndEnd.startHour + index
        ),
        [timelineStartAndEnd.endHour, timelineStartAndEnd.startHour]
    );

    const targetMetaById = useMemo(() => {
        const accentById = buildWeeklyTargetAccentMap(selectedWeekTargets, goals);
        const byId = new Map<string, { title: string; accent: string }>();
        selectedWeekTargets.forEach((target) => {
            byId.set(String(target.id), {
                title: target.title,
                accent: accentById.get(String(target.id)) ?? DEFAULT_WEEKLY_TARGET_ACCENT
            });
        });
        return byId;
    }, [goals, selectedWeekTargets]);

    const timelineBlocks = useMemo<TimelineBlock[]>(() => {
        return dayBlocks
            .map((block, originalIndex) => {
                if (isFlexibleBlock(block)) return null;
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

    const allBlocksWithIndex = useMemo<BlockWithIndex[]>(
        () => dayBlocks.map((block, originalIndex) => ({ block, originalIndex })),
        [dayBlocks]
    );
    const plannedBlocks = useMemo<BlockWithIndex[]>(
        () => allBlocksWithIndex
            .filter(({ block }) => !isFlexibleBlock(block))
            .sort((a, b) => {
                const aStart = parseTimeToMinutes(a.block.startTime) ?? Number.MAX_SAFE_INTEGER;
                const bStart = parseTimeToMinutes(b.block.startTime) ?? Number.MAX_SAFE_INTEGER;
                return aStart - bStart || a.originalIndex - b.originalIndex;
            }),
        [allBlocksWithIndex]
    );
    const flexibleBlocks = useMemo<BlockWithIndex[]>(
        () => allBlocksWithIndex.filter(({ block }) => isFlexibleBlock(block)),
        [allBlocksWithIndex]
    );
    const openWeeklyTargetSuggestions = useMemo(
        () => getWeeklyRemaining(selectedWeek).filter((target) => target.remaining > 0).slice(0, 3),
        [getWeeklyRemaining, selectedWeek]
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
        setIsTemplatePickerOpen(false);
        if (dayPlanViewMode !== "timeline") {
            timelineAutoScrollKeyRef.current = "";
        }
    }, [dayPlanViewMode, selectedDate]);

    useEffect(() => {
        if (!composerRequest) return;
        if (handledComposerRequestIdRef.current === composerRequest.id) return;
        handledComposerRequestIdRef.current = composerRequest.id;
        if (dayPlanViewMode !== "list") {
            setDayPlanViewMode("list");
        }
        setIsComposerOpen(true);
        setIsTemplatePickerOpen(false);
    }, [composerRequest, dayPlanViewMode, setDayPlanViewMode]);

    const triggerCompletionFx = useCallback((blockId: Id) => {
        const key = String(blockId);
        setCompletionFxById((prev) => ({ ...prev, [key]: true }));

        const existingTimeout = completionFxTimeoutRef.current.get(key);
        if (existingTimeout) {
            window.clearTimeout(existingTimeout);
        }

        const timeoutId = window.setTimeout(() => {
            setCompletionFxById((prev) => {
                if (!prev[key]) return prev;
                const next = { ...prev };
                delete next[key];
                return next;
            });
            completionFxTimeoutRef.current.delete(key);
        }, COMPLETION_FX_DURATION_MS);

        completionFxTimeoutRef.current.set(key, timeoutId);
    }, []);

    useEffect(() => {
        return () => {
            completionFxTimeoutRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
            completionFxTimeoutRef.current.clear();
        };
    }, []);

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

    const startCompletionInteraction = useCallback(
        (event: ReactPointerEvent<HTMLButtonElement>, block: DailyBlock, options: { usesCounter: boolean; isDone: boolean }) => {
            if (isArchiveView || options.usesCounter) return;
            if (event.button !== 0) return;

            event.preventDefault();
            event.stopPropagation();

            const track = event.currentTarget.parentElement;
            if (!track) return;

            const travelPx = Math.max(18, track.getBoundingClientRect().width - event.currentTarget.getBoundingClientRect().width - 4);
            const initialProgress = options.isDone ? 1 : 0;
            completionDragSessionRef.current = {
                blockId: block.id,
                pointerId: event.pointerId,
                startX: event.clientX,
                travelPx,
                initialProgress,
                progress: initialProgress,
                didDrag: false,
                committed: false,
                nextDoneState: !options.isDone
            };
            setCompletionDragState({ blockId: block.id, progress: initialProgress });

            try {
                event.currentTarget.setPointerCapture(event.pointerId);
            } catch {
                // Pointer capture is optional and can fail on some browsers.
            }
        },
        [isArchiveView]
    );

    const moveCompletionInteraction = useCallback(
        (event: ReactPointerEvent<HTMLButtonElement>, block: DailyBlock, options: { usesCounter: boolean; isDone: boolean }) => {
            if (isArchiveView || options.usesCounter) return;
            const session = completionDragSessionRef.current;
            if (!session) return;
            if (session.blockId !== block.id || session.pointerId !== event.pointerId) return;

            event.preventDefault();
            event.stopPropagation();

            const deltaX = event.clientX - session.startX;
            const nextProgress = Math.max(0, Math.min(1, session.initialProgress + (deltaX / session.travelPx)));
            if (nextProgress > 0.03) {
                session.didDrag = true;
            }
            session.progress = nextProgress;
            setCompletionDragState({ blockId: block.id, progress: nextProgress });

            if (!session.committed) {
                if (session.nextDoneState && nextProgress >= COMPLETION_DRAG_THRESHOLD) {
                    session.committed = true;
                    session.progress = 1;
                    setCompletionDragState({ blockId: block.id, progress: 1 });
                    handleToggleCompletion(block, true);
                    triggerCompletionFx(block.id);
                } else if (!session.nextDoneState && nextProgress <= (1 - COMPLETION_DRAG_THRESHOLD)) {
                    session.committed = true;
                    session.progress = 0;
                    setCompletionDragState({ blockId: block.id, progress: 0 });
                    handleToggleCompletion(block, false);
                }
            }
        },
        [handleToggleCompletion, isArchiveView, triggerCompletionFx]
    );

    const endCompletionInteraction = useCallback(
        (event: ReactPointerEvent<HTMLButtonElement>, block: DailyBlock, options: { usesCounter: boolean; isDone: boolean }) => {
            if (isArchiveView || options.usesCounter) return;
            const session = completionDragSessionRef.current;
            if (!session) return;
            if (session.blockId !== block.id || session.pointerId !== event.pointerId) return;

            event.preventDefault();
            event.stopPropagation();

            const shouldToggleOnTap = !session.committed && !session.didDrag;
            const shouldSnapToDone = !session.committed && session.nextDoneState && session.progress >= COMPLETION_DRAG_THRESHOLD;
            const shouldSnapToPending = !session.committed && !session.nextDoneState && session.progress <= (1 - COMPLETION_DRAG_THRESHOLD);

            if (shouldToggleOnTap || shouldSnapToDone || shouldSnapToPending) {
                handleToggleCompletion(block, session.nextDoneState);
                if (session.nextDoneState) {
                    triggerCompletionFx(block.id);
                }
            }

            completionDragSessionRef.current = null;
            setCompletionDragState(null);

            try {
                event.currentTarget.releasePointerCapture(event.pointerId);
            } catch {
                // Ignore release errors when capture is not active.
            }
        },
        [handleToggleCompletion, isArchiveView, triggerCompletionFx]
    );

    const cancelCompletionInteraction = useCallback(
        (event: ReactPointerEvent<HTMLButtonElement>, block: DailyBlock, options: { usesCounter: boolean; isDone: boolean }) => {
            if (isArchiveView || options.usesCounter) return;
            const session = completionDragSessionRef.current;
            if (!session) return;
            if (session.blockId !== block.id || session.pointerId !== event.pointerId) return;

            event.preventDefault();
            event.stopPropagation();

            completionDragSessionRef.current = null;
            setCompletionDragState(null);

            try {
                event.currentTarget.releasePointerCapture(event.pointerId);
            } catch {
                // Ignore release errors when capture is not active.
            }
        },
        [isArchiveView]
    );

    const handleAddBlockSubmit = useCallback(async () => {
        const didAdd = await onAddBlock(selectedDate);
        if (didAdd) {
            setIsComposerOpen(false);
            setIsTemplatePickerOpen(false);
        }
    }, [onAddBlock, selectedDate]);
    const handleQuickAddFromTarget = useCallback(async (target: WeeklyTarget & { remaining: number }) => {
        const quickDraft: DailyBlockDraft = {
            ...blockDraft,
            title: target.title,
            linkedTargetId: String(target.id),
            amount: Math.max(1, Math.floor(target.remaining || 1)),
            actual: 0,
            isFlexible: true,
            startTime: "",
            endTime: ""
        };
        const didAdd = await onAddBlock(selectedDate, quickDraft);
        if (didAdd) {
            setIsComposerOpen(false);
            setIsTemplatePickerOpen(false);
        }
    }, [blockDraft, onAddBlock, selectedDate]);

    const applyDraftTimedDefaults = useCallback(() => {
        setBlockDraft((prev) => {
            const fallbackTimes = getNextRoundedTimeRange();
            return {
                ...prev,
                isFlexible: false,
                startTime: prev.startTime || fallbackTimes.startTime,
                endTime: prev.endTime || fallbackTimes.endTime
            };
        });
    }, [setBlockDraft]);

    const clearDraftTime = useCallback(() => {
        setBlockDraft((prev) => ({
            ...prev,
            isFlexible: true,
            startTime: "",
            endTime: ""
        }));
    }, [setBlockDraft]);

    const startBlockEdit = useCallback((block: DailyBlock) => {
        setEditingBlockId(block.id);
        setEditingDraft(createBlockEditDraft(block));
    }, []);

    const cancelBlockEdit = useCallback(() => {
        setEditingBlockId(null);
        setEditingDraft(null);
    }, []);

    const applyEditingTimedDefaults = useCallback(() => {
        setEditingDraft((prev) => {
            if (!prev) return prev;
            const fallbackTimes = getNextRoundedTimeRange();
            return {
                ...prev,
                isFlexible: false,
                startTime: prev.startTime || fallbackTimes.startTime,
                endTime: prev.endTime || fallbackTimes.endTime
            };
        });
    }, []);

    const clearEditingTime = useCallback(() => {
        setEditingDraft((prev) => (
            prev
                ? {
                    ...prev,
                    isFlexible: true,
                    startTime: "",
                    endTime: ""
                }
                : prev
        ));
    }, []);

    const handleSaveBlockEdit = useCallback(async (block: DailyBlock) => {
        if (editingBlockId !== block.id || !editingDraft) return;
        const trimmedTitle = editingDraft.title.trim();
        if (!trimmedTitle) return;
        if (!editingDraft.isFlexible && (!editingDraft.startTime || !editingDraft.endTime)) return;

        const amountRaw = editingDraft.amount.trim();
        let nextAmount: number | undefined;
        if (amountRaw) {
            const parsed = Number.parseInt(amountRaw, 10);
            if (Number.isNaN(parsed)) return;
            nextAmount = Math.min(9999, Math.max(1, parsed));
        }

        await onUpdateBlock(selectedDate, block.id, {
            startTime: editingDraft.isFlexible ? null : (editingDraft.startTime || block.startTime || "09:00"),
            endTime: editingDraft.isFlexible ? null : (editingDraft.endTime || block.endTime || "10:00"),
            isFlexible: editingDraft.isFlexible ? true : undefined,
            title: trimmedTitle,
            linkedTargetId: editingDraft.linkedTargetId ? editingDraft.linkedTargetId : undefined,
            amount: nextAmount
        });

        setEditingBlockId(null);
        setEditingDraft(null);
    }, [editingBlockId, editingDraft, onUpdateBlock, selectedDate]);

    const formatTimelineMarker = useCallback((hour: number) => {
        if (hour === 24) {
            return timeFormat === "24h" ? "24:00" : "12:00 AM";
        }
        return formatTime(`${String(hour).padStart(2, "0")}:00`, timeFormat);
    }, [timeFormat]);

    useEffect(() => {
        if (editingBlockId === null) return;
        const stillExists = dayBlocks.some((block) => block.id === editingBlockId);
        if (stillExists) return;
        setEditingBlockId(null);
        setEditingDraft(null);
    }, [dayBlocks, editingBlockId]);

    const openBlockEditor = useCallback((block: DailyBlock) => {
        startBlockEdit(block);
    }, [startBlockEdit]);

    const editingBlock = useMemo(
        () => editingBlockId ? dayBlocks.find((block) => block.id === editingBlockId) ?? null : null,
        [dayBlocks, editingBlockId]
    );

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

    const renderListBlockItem = useCallback((entry: BlockWithIndex, allowReorder: boolean) => {
        const { block, originalIndex } = entry;
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
        const isTouchDragActive = allowReorder && touchDraggingBlockId === block.id;
        const isTouchDragOver = allowReorder && touchDragOverBlockId === block.id && !isTouchDragActive;
        const hasFixedTime = !isFlexibleBlock(block) && Boolean(block.startTime) && Boolean(block.endTime);
        const linkedTargetMeta = block.linkedTargetId
            ? targetMetaById.get(String(block.linkedTargetId))
            : null;
        const linkedTargetTitle = linkedTargetMeta?.title ?? null;
        const targetAccent = linkedTargetMeta?.accent ?? null;
        const statusLabel = isDone ? tr(language, "today.completedStatus") : tr(language, "today.pendingStatus");
        const isCompleting = Boolean(completionFxById[String(block.id)]);
        const completionDragProgress = completionDragState?.blockId === block.id ? completionDragState.progress : 0;
        const completionProgress = completionDragState?.blockId === block.id
            ? completionDragProgress
            : (isDone ? 1 : 0);
        const canUndoFromBadge = isDone;
        const completionSlideEnabled = !isArchiveView && !usesCounter;
        const completionClickEnabled = !isArchiveView;
        const applyCounterActual = (nextActualRaw: number) => {
            const nextActual = Math.min(Math.max(nextActualRaw, 0), plannedAmount);
            const nextDone = nextActual >= plannedAmount;
            if (!isDone && nextDone) {
                triggerCompletionFx(block.id);
            }
            onUpdateBlock(selectedDate, block.id, {
                actual: nextActual,
                done: nextDone
            });
        };

        return (
            <div
                key={block.id}
                className={`list-item block planner-block-card ${targetAccent ? "has-target-accent" : ""} ${isDone ? "done" : ""} ${isCompleting ? "is-completing" : ""} ${draggingBlockId === block.id ? "dragging" : ""} ${isTouchDragActive ? "touch-drag-active" : ""} ${isTouchDragOver ? "touch-drag-over" : ""}`}
                data-block-id={String(block.id)}
                data-block-index={allowReorder ? originalIndex : undefined}
                data-block-type={hasFixedTime ? "geplant" : linkedTargetTitle ? "flex-task" : "flex-notask"}
                style={targetAccent ? ({ "--planner-target-accent": targetAccent } as CSSProperties) : undefined}
                onDragOver={(e) => {
                    if (isArchiveView || !allowReorder) return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                }}
                onDrop={() => {
                    if (isArchiveView || !allowReorder) return;
                    if (draggingBlockId && draggingBlockId !== block.id) {
                        const fromIdx = dayBlocks.findIndex((item) => item.id === draggingBlockId);
                        if (fromIdx >= 0) {
                            onReorderBlocks(selectedDate, fromIdx, originalIndex);
                        }
                    }
                    setDraggingBlockId(null);
                }}
            >
                <div
                    className={`drag-handle ${allowReorder ? "" : "disabled"}`}
                    draggable={allowReorder && !isArchiveView}
                    onPointerDown={(e) => {
                        if (!allowReorder) return;
                        startTouchReorder(e, block.id, originalIndex);
                    }}
                    onDragStart={(e) => {
                        if (isArchiveView || !allowReorder) {
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
                    <div className="planner-block-header">
                        <div className="planner-block-heading-container">
                            <span className="planner-block-time-or-type">
                                {hasFixedTime && block.startTime && block.endTime
                                    ? `${formatTime(block.startTime, timeFormat)}–${formatTime(block.endTime, timeFormat)}`
                                    : <><span className="muted">{tr(language, "today.flexibleBlocks")} ·</span></>}
                            </span>
                            <strong className="planner-block-heading">
                                {block.title}
                            </strong>
                        </div>
                        {linkedTargetTitle && (
                            <span className="planner-meta-chip planner-target-chip planner-block-header-target" title={linkedTargetTitle}>
                                <span className="planner-target-dot" aria-hidden="true" />
                                <span className="planner-target-label">{linkedTargetTitle}</span>
                            </span>
                        )}
                    </div>

                    {linkedTargetTitle && (
                        <div className="planner-linked-target-row">
                            <span className="planner-linked-target-info" title={linkedTargetTitle}>
                                <span aria-hidden="true">🎯</span>
                                <span>{linkedTargetTitle}</span>
                            </span>
                        </div>
                    )}

                    <div className="planner-meta-row">
                        <div className="planner-meta-actions">
                            {(!usesCounter || canUndoFromBadge) ? (
                                <button
                                    type="button"
                                    className={`planner-meta-chip planner-status-chip is-interactive ${isDone ? "done" : "pending"}`}
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onTouchStart={(e) => e.stopPropagation()}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (isDone) {
                                            if (usesCounter) {
                                                const nextActual = Math.max(0, plannedAmount - 1);
                                                onUpdateBlock(selectedDate, block.id, {
                                                    done: false,
                                                    actual: nextActual
                                                });
                                                return;
                                            }
                                            handleToggleCompletion(block, false);
                                            return;
                                        }

                                        handleToggleCompletion(block, true);
                                        triggerCompletionFx(block.id);
                                    }}
                                    title={tr(language, "today.markLabel")}
                                    aria-label={tr(language, "today.markLabel")}
                                >
                                    {statusLabel}
                                </button>
                            ) : (
                                <span className={`planner-meta-chip planner-status-chip ${isDone ? "done" : "pending"}`}>
                                    {statusLabel}
                                </span>
                            )}

                            <div className="planner-block-actions">
                                <div
                                    className={`planner-completion-track ${completionSlideEnabled ? "is-slide-enabled" : ""} ${completionClickEnabled ? "is-click-enabled" : ""} ${isDone ? "is-done" : ""} ${completionDragState?.blockId === block.id ? "is-dragging" : ""} ${isCompleting ? "is-animating" : ""}`}
                                    style={{ "--completion-progress": `${completionProgress}` } as CSSProperties}
                                >
                                    <button
                                        type="button"
                                        className="planner-completion-handle"
                                        title={tr(language, "today.markLabel")}
                                        aria-label={tr(language, "today.markLabel")}
                                        onPointerDown={(event) => startCompletionInteraction(event, block, { usesCounter, isDone })}
                                        onPointerMove={(event) => moveCompletionInteraction(event, block, { usesCounter, isDone })}
                                        onPointerUp={(event) => endCompletionInteraction(event, block, { usesCounter, isDone })}
                                        onPointerCancel={(event) => {
                                            cancelCompletionInteraction(event, block, { usesCounter, isDone });
                                        }}
                                        onClick={(event) => {
                                            event.preventDefault();
                                            event.stopPropagation();

                                            if (isArchiveView) return;

                                            if (!usesCounter) {
                                                // Non-counter blocks are handled via pointer tap/slide interaction.
                                                return;
                                            }

                                            if (isDone) {
                                                if (usesCounter) {
                                                    const nextActual = Math.max(0, plannedAmount - 1);
                                                    onUpdateBlock(selectedDate, block.id, {
                                                        done: false,
                                                        actual: nextActual
                                                    });
                                                    return;
                                                }
                                                handleToggleCompletion(block, false);
                                                return;
                                            }

                                            if (usesCounter) {
                                                handleToggleCompletion(block, true);
                                                triggerCompletionFx(block.id);
                                            }
                                        }}
                                    >
                                        <Icon icon={Check} size={12} />
                                    </button>
                                </div>
                                <button
                                    data-no-drag="true"
                                    className="block-edit-btn"
                                    title={tr(language, "common.edit")}
                                    aria-label={tr(language, "common.edit")}
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onClick={() => openBlockEditor(block)}
                                >
                                    <Icon icon={PencilLine} size={14} />
                                </button>
                                <button
                                    data-no-drag="true"
                                    className="block-delete-x"
                                    title={tr(language, "common.delete")}
                                    aria-label={tr(language, "common.delete")}
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onClick={() => onDeleteBlock(selectedDate, block.id)}
                                >
                                    <Icon icon={Trash2} size={14} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {usesCounter && (
                        <div className="planner-block-progress">
                            <div
                                className="block-progress-row"
                                data-no-drag="true"
                                onPointerDown={(e) => e.stopPropagation()}
                                onMouseDown={(e) => e.stopPropagation()}
                                onTouchStart={(e) => e.stopPropagation()}
                            >
                                <div className="block-counter block-counter-shell">
                                    <input
                                        className="block-counter-range"
                                        type="range"
                                        min={0}
                                        max={plannedAmount}
                                        value={sliderValue}
                                        style={{ "--slider-fill": `${sliderPercent}%` } as CSSProperties}
                                        draggable={false}
                                        onMouseDown={(e) => e.stopPropagation()}
                                        onTouchStart={(e) => e.stopPropagation()}
                                        onClick={(e) => e.stopPropagation()}
                                        onKeyDown={(e) => e.stopPropagation()}
                                        onChange={(e) => applyCounterActual(Number(e.target.value))}
                                    />
                                    <div className="block-counter-side">
                                        <span className="block-counter-value">
                                            🎯 {actualValue}/{plannedAmount} {block.amount ? "" : ""} · {Math.max(0, plannedAmount - actualValue)} {tr(language, "today.open")}
                                        </span>
                                        <div className="block-counter-buttons-wrap">
                                            <button
                                                type="button"
                                                className="block-counter-adjust-btn"
                                                title={tr(language, "today.decreaseActual")}
                                                aria-label={tr(language, "today.decreaseActual")}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    applyCounterActual(actualValue - 1);
                                                }}
                                            >
                                                -
                                            </button>
                                            <button
                                                type="button"
                                                className="block-counter-adjust-btn"
                                                title={tr(language, "today.increaseActual")}
                                                aria-label={tr(language, "today.increaseActual")}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    applyCounterActual(actualValue + 1);
                                                }}
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }, [
        dayBlocks,
        draggingBlockId,
        isArchiveView,
        language,
        onDeleteBlock,
        onReorderBlocks,
        onUpdateBlock,
        openBlockEditor,
        selectedDate,
        setDraggingBlockId,
        startTouchReorder,
        targetMetaById,
        timeFormat,
        triggerCompletionFx,
        handleToggleCompletion,
        completionDragState,
        completionFxById,
        cancelCompletionInteraction,
        endCompletionInteraction,
        moveCompletionInteraction,
        startCompletionInteraction,
        touchDragOverBlockId,
        touchDraggingBlockId
    ]);

    return (
        <div className="subcard today-dayplan-section">
            <div className="today-dayplan-header">
                <div className="today-section-header-left">
                    <CalendarDays size={18} weight="duotone" className="today-section-icon" aria-hidden="true" />
                    <h3 className="today-section-title">{tr(language, "today.dayPlan")}</h3>
                </div>
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
                        className={`primary today-dayplan-add-btn today-add-block-plus-btn ${isComposerOpen ? "open" : ""}`}
                        onClick={() => {
                            setIsComposerOpen((prev) => {
                                const next = !prev;
                                if (!next) {
                                    setIsTemplatePickerOpen(false);
                                }
                                return next;
                            });
                        }}
                        title={isComposerOpen ? tr(language, "common.close") : tr(language, "today.blockAdd")}
                        aria-label={isComposerOpen ? tr(language, "common.close") : tr(language, "today.blockAdd")}
                    >
                        <span className="today-dayplan-add-icon" aria-hidden="true">+</span>
                    </button>
                </div>
            </div>

            {isComposerOpen && (
                <div className="today-dayplan-composer-card">
                    <div className="grid today-dayplan-composer-grid">
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
                    <div className="today-block-editor-time-cta today-dayplan-timing-panel">
                        <div className="today-block-editor-time-copy">
                            <span className="today-block-editor-time-label">{tr(language, "today.timing")}</span>
                            <strong>{blockDraft.isFlexible ? tr(language, "today.flexibleBlocks") : tr(language, "today.plannedBlocks")}</strong>
                            {blockDraft.isFlexible && <p className="muted">{tr(language, "today.noFixedTimeHint")}</p>}
                        </div>
                        <button
                            type="button"
                            onClick={blockDraft.isFlexible ? applyDraftTimedDefaults : clearDraftTime}
                        >
                            {tr(language, blockDraft.isFlexible ? "today.setTime" : "today.removeTime")}
                        </button>
                    </div>
                    {!blockDraft.isFlexible && (
                        <div className="grid grid-two today-block-time-grid">
                            <label>
                                {tr(language, "common.start")}
                                <input type="time" value={blockDraft.startTime} onChange={(e) => setBlockDraft({ ...blockDraft, startTime: e.target.value })} />
                            </label>
                            <label>
                                {tr(language, "common.end")}
                                <input type="time" value={blockDraft.endTime} onChange={(e) => setBlockDraft({ ...blockDraft, endTime: e.target.value })} />
                            </label>
                        </div>
                    )}
                    <div className="button-row today-dayplan-composer-actions">
                        <button className="primary" onClick={handleAddBlockSubmit}>{tr(language, "today.blockAdd")}</button>
                        <button
                            type="button"
                            onClick={() => {
                                setIsComposerOpen(false);
                                setIsTemplatePickerOpen(false);
                            }}
                        >
                            {tr(language, "common.cancel")}
                        </button>
                        {templates.length > 0 && (
                            <button
                                type="button"
                                className={isTemplatePickerOpen ? "active" : ""}
                                onClick={() => setIsTemplatePickerOpen((prev) => !prev)}
                            >
                                {tr(language, "today.loadTemplate")}
                            </button>
                        )}
                        {dayPlanViewMode === "list" && dayBlocks.length > 0 && (
                            <button onClick={onOpenTemplateModal}>{tr(language, "today.saveAsTemplate")}</button>
                        )}
                    </div>
                    {templates.length > 0 && isTemplatePickerOpen && (
                        <div className="today-dayplan-template-panel">
                            <p className="muted">{tr(language, "today.templates")}</p>
                            <div className="template-list">
                                {templates.map((template) => (
                                    <div key={template.id} className="template-item">
                                        <div>
                                            <strong>{template.name}</strong>
                                            <span className="muted"> · {tr(language, "today.blocksCount", { count: template.blocks.length })}</span>
                                        </div>
                                        <div className="button-row compact">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    onLoadTemplate(template);
                                                    setIsTemplatePickerOpen(false);
                                                    setIsComposerOpen(false);
                                                }}
                                            >
                                                {tr(language, "common.load")}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => onDeleteTemplate(template.id)}
                                                aria-label={tr(language, "common.delete")}
                                                title={tr(language, "common.delete")}
                                            >
                                                <Icon icon={Trash2} size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {dayPlanViewMode === "list" && (
                <div className="today-list-sections">
                    {dayBlocks.length === 0 && (
                        <div className="today-empty-state today-empty-state-smart">
                            <p className="today-empty-message">
                                <span className="today-empty-icon" aria-hidden="true">📋</span>
                                <span>{tr(language, "today.noBlocks")}</span>
                            </p>
                            {openWeeklyTargetSuggestions.length > 0 ? (
                                <div className="today-smart-suggestions">
                                    <p className="today-suggestion-label">
                                        💡 {language === "de" ? "Offene Weekly Targets" : "Open weekly targets"}
                                    </p>
                                    <div className="today-suggestion-items">
                                        {openWeeklyTargetSuggestions.map((target) => (
                                            <button
                                                key={target.id}
                                                type="button"
                                                className="today-suggestion-item"
                                                onClick={() => void handleQuickAddFromTarget(target)}
                                                disabled={isArchiveView}
                                            >
                                                <span>{target.title}</span>
                                                <Icon icon={Plus} size={14} />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    className="today-empty-add-btn today-add-block-cta-btn"
                                    onClick={() => setIsComposerOpen(true)}
                                >
                                    <Icon icon={Plus} size={14} />
                                    {tr(language, "today.blockAdd")}
                                </button>
                            )}
                        </div>
                    )}

                    {plannedBlocks.length > 0 && (
                        <section className="today-blocks-group">
                            <div className="today-blocks-group-header">
                                <h4>{tr(language, "today.plannedBlocks")}</h4>
                            </div>
                            <div className="list sortable">
                                {plannedBlocks.map((entry) => renderListBlockItem(entry, false))}
                            </div>
                        </section>
                    )}

                    {flexibleBlocks.length > 0 && (
                        <section className="today-blocks-group today-blocks-group-flexible">
                            <div className="today-blocks-group-header">
                                <h4>{tr(language, "today.flexibleBlocks")}</h4>
                                <p className="muted">{tr(language, "today.flexibleHint")}</p>
                            </div>
                            <div className="list sortable">
                                {flexibleBlocks.map((entry) => renderListBlockItem(entry, true))}
                            </div>
                        </section>
                    )}
                </div>
            )}

            {dayPlanViewMode === "timeline" && (
                <div className={`today-timeline-layout zoom-${timelineZoomLevel}`}>
                    {dayBlocks.length === 0 ? (
                        <p className="empty">{tr(language, "today.noBlocks")}</p>
                    ) : (
                        <>
                            {flexibleBlocks.length > 0 && (
                                <div className="today-untimed-section">
                                    <h4>{tr(language, "today.flexibleBlocks")}</h4>
                                    <p className="muted">{tr(language, "today.flexibleHint")}</p>
                                    <div className="today-untimed-list">
                                        {flexibleBlocks.map(({ block }) => {
                                            const { isDone } = getBlockCompletionState({
                                                amount: block.amount,
                                                actual: block.actual,
                                                done: block.done
                                            });
                                            const linkedTargetMeta = block.linkedTargetId
                                                ? targetMetaById.get(String(block.linkedTargetId))
                                                : null;
                                            const linkedTargetTitle = block.linkedTargetId
                                                ? linkedTargetMeta?.title ?? tr(language, "week.weeklyTarget")
                                                : null;
                                            const targetAccent = linkedTargetMeta?.accent;
                                            const untimedTooltip = [
                                                block.title,
                                                linkedTargetTitle ? tr(language, "today.linked", { target: linkedTargetTitle }) : null
                                            ]
                                                .filter((part): part is string => Boolean(part))
                                                .join(" · ");
                                            return (
                                                <button
                                                    key={block.id}
                                                    type="button"
                                                    className={`today-untimed-item ${isDone ? "done" : ""} ${linkedTargetTitle ? "has-target" : ""}`}
                                                    style={targetAccent ? ({ "--timeline-block-accent": targetAccent } as CSSProperties) : undefined}
                                                    onClick={() => openBlockEditor(block)}
                                                    title={untimedTooltip}
                                                >
                                                    <div className="today-untimed-mainline">
                                                        <strong className="today-timeline-title">{block.title}</strong>
                                                        {linkedTargetTitle ? (
                                                            <span
                                                                className="today-timeline-badge today-timeline-badge-target"
                                                                style={targetAccent ? ({ "--timeline-block-accent": targetAccent } as CSSProperties) : undefined}
                                                                title={linkedTargetTitle}
                                                            >
                                                                {linkedTargetTitle}
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                    <div
                                                        className="today-untimed-actions"
                                                        onPointerDown={(e) => e.stopPropagation()}
                                                        onMouseDown={(e) => e.stopPropagation()}
                                                        onTouchStart={(e) => e.stopPropagation()}
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <ToggleSwitch
                                                            checked={isDone}
                                                            ariaLabel={tr(language, "today.markLabel")}
                                                            onChange={(checked) => handleToggleCompletion(block, checked)}
                                                        />
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            <div className={`today-timeline-shell ${flexibleBlocks.length > 0 ? "with-flexible-prelude" : ""}`}>
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
                                                const { isDone } = getBlockCompletionState({
                                                    amount: entry.block.amount,
                                                    actual: entry.block.actual,
                                                    done: entry.block.done
                                                });
                                                const linkedTargetMeta = entry.block.linkedTargetId
                                                    ? targetMetaById.get(String(entry.block.linkedTargetId))
                                                    : null;
                                                const linkedTargetTitle = entry.block.linkedTargetId
                                                    ? linkedTargetMeta?.title ?? tr(language, "week.weeklyTarget")
                                                    : null;
                                                const targetAccent = linkedTargetMeta?.accent;
                                                const startLabel = formatTime(entry.displayStart, timeFormat);
                                                const endLabel = formatTime(entry.displayEnd, timeFormat);
                                                const timelineTooltip = [
                                                    entry.block.title,
                                                    `${startLabel}–${endLabel}`,
                                                    linkedTargetTitle ? tr(language, "today.linked", { target: linkedTargetTitle }) : null
                                                ]
                                                    .filter((part): part is string => Boolean(part))
                                                    .join(" · ");
                                                return (
                                                    <button
                                                        key={entry.block.id}
                                                        type="button"
                                                        className={`today-timeline-block ${isDone ? "done" : ""} ${linkedTargetTitle ? "has-target" : ""}`}
                                                        style={{
                                                            top: `${entry.top}px`,
                                                            height: `${entry.height}px`,
                                                            ...(targetAccent ? { "--timeline-block-accent": targetAccent } : {})
                                                        } as CSSProperties}
                                                        onClick={() => openBlockEditor(entry.block)}
                                                        title={timelineTooltip}
                                                    >
                                                        <div className="today-timeline-mainline">
                                                            <span className="today-timeline-time-range">{`${startLabel}–${endLabel}`}</span>
                                                            <strong className="today-timeline-title">{entry.block.title}</strong>
                                                        </div>
                                                        {linkedTargetTitle && (
                                                            <div className="today-timeline-chip-wrap">
                                                                <span
                                                                    className="today-timeline-badge today-timeline-badge-target"
                                                                    style={targetAccent ? ({ "--timeline-block-accent": targetAccent } as CSSProperties) : undefined}
                                                                    title={linkedTargetTitle}
                                                                >
                                                                    {linkedTargetTitle}
                                                                </span>
                                                            </div>
                                                        )}
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
                        </>
                    )}
                </div>
            )}

            {editingBlock && editingDraft && (
                <div className="overlay-backdrop" onClick={cancelBlockEdit}>
                    <div className="overlay-card today-block-editor-sheet" onClick={(event) => event.stopPropagation()}>
                        <div className="overlay-header">
                            <h3>{tr(language, "common.edit")}</h3>
                            <button
                                type="button"
                                className="block-delete-x today-block-sheet-close"
                                onClick={cancelBlockEdit}
                                aria-label={tr(language, "common.close")}
                                title={tr(language, "common.close")}
                            >
                                <Icon icon={X} size={14} />
                            </button>
                        </div>

                        <div className="today-block-editor-fields">
                            <label>
                                {tr(language, "common.title")}
                                <input
                                    value={editingDraft.title}
                                    onChange={(e) => setEditingDraft((prev) => prev ? { ...prev, title: e.target.value } : prev)}
                                    placeholder={tr(language, "today.blockPlaceholder")}
                                />
                            </label>

                            <label>
                                {tr(language, "today.weeklyTargetOptional")}
                                <select
                                    value={editingDraft.linkedTargetId}
                                    onChange={(e) => setEditingDraft((prev) => prev ? { ...prev, linkedTargetId: e.target.value } : prev)}
                                >
                                    <option value="">{tr(language, "common.none")}</option>
                                    {selectedWeekTargets.map((target) => (
                                        <option key={target.id} value={target.id}>{target.title}</option>
                                    ))}
                                </select>
                            </label>

                            <div className="today-block-editor-time-cta">
                                <div className="today-block-editor-time-copy">
                                    <span className="today-block-editor-time-label">{tr(language, "today.timing")}</span>
                                    <strong>{editingDraft.isFlexible ? tr(language, "today.flexibleBlocks") : tr(language, "today.plannedBlocks")}</strong>
                                    {editingDraft.isFlexible && <p className="muted">{tr(language, "today.noFixedTimeHint")}</p>}
                                </div>
                                <button
                                    type="button"
                                    onClick={editingDraft.isFlexible ? applyEditingTimedDefaults : clearEditingTime}
                                >
                                    {tr(language, editingDraft.isFlexible ? "today.setTime" : "today.removeTime")}
                                </button>
                            </div>
                            {!editingDraft.isFlexible && (
                                <div className="grid grid-two today-block-time-grid">
                                    <label>
                                        {tr(language, "common.start")}
                                        <input
                                            type="time"
                                            value={editingDraft.startTime}
                                            onChange={(e) => setEditingDraft((prev) => prev ? { ...prev, startTime: e.target.value } : prev)}
                                        />
                                    </label>
                                    <label>
                                        {tr(language, "common.end")}
                                        <input
                                            type="time"
                                            value={editingDraft.endTime}
                                            onChange={(e) => setEditingDraft((prev) => prev ? { ...prev, endTime: e.target.value } : prev)}
                                        />
                                    </label>
                                </div>
                            )}

                            <label>
                                {tr(language, "today.plannedAmountOptional")}
                                <input
                                    type="number"
                                    min={1}
                                    step={1}
                                    value={editingDraft.amount}
                                    onChange={(e) => setEditingDraft((prev) => prev ? { ...prev, amount: e.target.value } : prev)}
                                />
                            </label>
                        </div>

                        <div className="today-block-editor-footer">
                            <button
                                type="button"
                                className="ghost-danger"
                                onClick={() => {
                                    void onDeleteBlock(selectedDate, editingBlock.id);
                                    cancelBlockEdit();
                                }}
                            >
                                {tr(language, "common.delete")}
                            </button>
                            <div className="button-row compact">
                                <button type="button" onClick={cancelBlockEdit}>{tr(language, "common.cancel")}</button>
                                <button className="primary" onClick={() => void handleSaveBlockEdit(editingBlock)}>{tr(language, "common.save")}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
