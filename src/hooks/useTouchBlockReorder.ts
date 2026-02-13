import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { DailyBlock, Id } from "../types";

type UseTouchBlockReorderParams = {
    isArchiveView: boolean;
    dayBlocks: DailyBlock[];
    selectedDate: string;
    onReorderBlocks: (date: string, fromIndex: number, toIndex: number) => void;
};

export function useTouchBlockReorder({
    isArchiveView,
    dayBlocks,
    selectedDate,
    onReorderBlocks
}: UseTouchBlockReorderParams) {
    const [touchDraggingBlockId, setTouchDraggingBlockId] = useState<Id | null>(null);
    const [touchDragOverBlockId, setTouchDragOverBlockId] = useState<Id | null>(null);
    const touchDragRef = useRef<{ active: boolean; pointerId: number | null; currentIndex: number }>({
        active: false,
        pointerId: null,
        currentIndex: -1
    });

    const endTouchReorder = useCallback((pointerId?: number) => {
        const state = touchDragRef.current;
        if (!state.active) return;
        if (pointerId !== undefined && state.pointerId !== null && pointerId !== state.pointerId) return;

        touchDragRef.current = {
            active: false,
            pointerId: null,
            currentIndex: -1
        };
        setTouchDraggingBlockId(null);
        setTouchDragOverBlockId(null);
    }, []);

    const handleTouchReorderMove = useCallback((event: PointerEvent) => {
        const state = touchDragRef.current;
        if (!state.active) return;
        if (state.pointerId !== null && event.pointerId !== state.pointerId) return;

        event.preventDefault();
        const hit = document.elementFromPoint(event.clientX, event.clientY);
        if (!(hit instanceof Element)) return;
        const row = hit.closest("[data-block-index]") as HTMLElement | null;
        if (!row) return;

        const targetIndex = Number(row.dataset.blockIndex);
        if (!Number.isInteger(targetIndex) || targetIndex < 0 || targetIndex >= dayBlocks.length) return;

        const hoveredBlock = dayBlocks[targetIndex];
        setTouchDragOverBlockId(hoveredBlock?.id ?? null);

        if (targetIndex === state.currentIndex) return;
        onReorderBlocks(selectedDate, state.currentIndex, targetIndex);
        state.currentIndex = targetIndex;
    }, [dayBlocks, onReorderBlocks, selectedDate]);

    useEffect(() => {
        if (!touchDraggingBlockId) return;

        const handlePointerUp = (event: PointerEvent) => {
            endTouchReorder(event.pointerId);
        };
        const handlePointerCancel = (event: PointerEvent) => {
            endTouchReorder(event.pointerId);
        };

        window.addEventListener("pointermove", handleTouchReorderMove, { passive: false });
        window.addEventListener("pointerup", handlePointerUp);
        window.addEventListener("pointercancel", handlePointerCancel);

        return () => {
            window.removeEventListener("pointermove", handleTouchReorderMove);
            window.removeEventListener("pointerup", handlePointerUp);
            window.removeEventListener("pointercancel", handlePointerCancel);
        };
    }, [touchDraggingBlockId, handleTouchReorderMove, endTouchReorder]);

    const startTouchReorder = useCallback((event: ReactPointerEvent<HTMLDivElement>, blockId: Id, index: number) => {
        if (isArchiveView) return;
        if (event.pointerType === "mouse") return;

        event.preventDefault();
        event.stopPropagation();
        touchDragRef.current = {
            active: true,
            pointerId: event.pointerId,
            currentIndex: index
        };
        setTouchDraggingBlockId(blockId);
        setTouchDragOverBlockId(blockId);

        if (event.currentTarget.setPointerCapture) {
            event.currentTarget.setPointerCapture(event.pointerId);
        }
    }, [isArchiveView]);

    return {
        touchDraggingBlockId,
        touchDragOverBlockId,
        startTouchReorder,
        endTouchReorder
    };
}
