import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type PointerEvent as ReactPointerEvent
} from "react";
import { Id, WeeklyTarget } from "../types";

type UseTouchTargetReorderParams = {
    isArchiveView: boolean;
    selectedWeek: number;
    totalWeeklyTargets: WeeklyTarget[];
    onReorderTargets: (weekIndex: number, fromIndex: number, toIndex: number) => void;
};

export function useTouchTargetReorder({
    isArchiveView,
    selectedWeek,
    totalWeeklyTargets,
    onReorderTargets
}: UseTouchTargetReorderParams) {
    const TOUCH_REORDER_LONG_PRESS_MS = 180;
    const [touchDraggingTargetId, setTouchDraggingTargetId] = useState<Id | null>(null);
    const [touchDragOverTargetId, setTouchDragOverTargetId] = useState<Id | null>(null);
    const touchDragRef = useRef<{ active: boolean; pointerId: number | null; currentIndex: number }>({
        active: false,
        pointerId: null,
        currentIndex: -1
    });
    const touchStartRef = useRef<{ timerId: number | null; pointerId: number | null }>({
        timerId: null,
        pointerId: null
    });

    useEffect(() => {
        return () => {
            const pending = touchStartRef.current;
            if (pending.timerId !== null) {
                window.clearTimeout(pending.timerId);
            }
        };
    }, []);

    const endTouchReorder = useCallback((pointerId?: number) => {
        const state = touchDragRef.current;
        if (!state.active) return;
        if (pointerId !== undefined && state.pointerId !== null && pointerId !== state.pointerId) return;

        touchDragRef.current = {
            active: false,
            pointerId: null,
            currentIndex: -1
        };
        setTouchDraggingTargetId(null);
        setTouchDragOverTargetId(null);
    }, []);

    const clearPendingTouchStart = useCallback((pointerId?: number) => {
        const pending = touchStartRef.current;
        if (pointerId !== undefined && pending.pointerId !== null && pointerId !== pending.pointerId) return;
        if (pending.timerId !== null) {
            window.clearTimeout(pending.timerId);
        }
        touchStartRef.current = {
            timerId: null,
            pointerId: null
        };
    }, []);

    const handleTouchReorderMove = useCallback((event: PointerEvent) => {
        const state = touchDragRef.current;
        if (!state.active) return;
        if (state.pointerId !== null && event.pointerId !== state.pointerId) return;

        event.preventDefault();
        const hit = document.elementFromPoint(event.clientX, event.clientY);
        if (!(hit instanceof Element)) return;
        const row = hit.closest("[data-target-index]") as HTMLElement | null;
        if (!row) return;

        const targetIndex = Number(row.dataset.targetIndex);
        if (!Number.isInteger(targetIndex) || targetIndex < 0 || targetIndex >= totalWeeklyTargets.length) return;

        const hoveredTarget = totalWeeklyTargets[targetIndex];
        setTouchDragOverTargetId(hoveredTarget?.id ?? null);
        if (targetIndex === state.currentIndex) return;

        onReorderTargets(selectedWeek, state.currentIndex, targetIndex);
        state.currentIndex = targetIndex;
    }, [onReorderTargets, selectedWeek, totalWeeklyTargets]);

    useEffect(() => {
        if (!touchDraggingTargetId) return;

        const handlePointerUp = (event: PointerEvent) => endTouchReorder(event.pointerId);
        const handlePointerCancel = (event: PointerEvent) => endTouchReorder(event.pointerId);

        window.addEventListener("pointermove", handleTouchReorderMove, { passive: false });
        window.addEventListener("pointerup", handlePointerUp);
        window.addEventListener("pointercancel", handlePointerCancel);
        return () => {
            window.removeEventListener("pointermove", handleTouchReorderMove);
            window.removeEventListener("pointerup", handlePointerUp);
            window.removeEventListener("pointercancel", handlePointerCancel);
        };
    }, [touchDraggingTargetId, handleTouchReorderMove, endTouchReorder]);

    const startTouchReorder = useCallback((event: ReactPointerEvent<HTMLDivElement>, targetId: Id, index: number) => {
        if (isArchiveView) return;
        if (event.pointerType === "mouse") return;

        event.preventDefault();
        event.stopPropagation();
        clearPendingTouchStart();

        const pointerId = event.pointerId;
        const handleElement = event.currentTarget;
        touchStartRef.current.pointerId = pointerId;
        touchStartRef.current.timerId = window.setTimeout(() => {
            touchDragRef.current = {
                active: true,
                pointerId,
                currentIndex: index
            };
            setTouchDraggingTargetId(targetId);
            setTouchDragOverTargetId(targetId);
            if (handleElement.setPointerCapture) {
                handleElement.setPointerCapture(pointerId);
            }
            touchStartRef.current = {
                timerId: null,
                pointerId: null
            };
        }, TOUCH_REORDER_LONG_PRESS_MS);
    }, [clearPendingTouchStart, isArchiveView]);

    return {
        touchDraggingTargetId,
        touchDragOverTargetId,
        startTouchReorder,
        clearPendingTouchStart,
        endTouchReorder
    };
}
