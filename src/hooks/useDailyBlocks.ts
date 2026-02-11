import { createCalendarEvent, deleteCalendarEvent, updateCalendarEvent } from "../googleCalendar";
import { Cycle, DailyBlock, Id } from "../types";
import { clamp, uid } from "../utils";
import { canReorderIndices } from "../regressionLogic";

export type DailyBlockDraft = {
    startTime: string;
    endTime: string;
    title: string;
    linkedTargetId: string;
    amount: number;
    actual: number;
};

type UseDailyBlocksParams = {
    cycle: Cycle | null;
    googleConnected: boolean;
    selectedCalendarId: string;
    updateCycle: (updater: (prev: Cycle) => Cycle) => void;
};

export function useDailyBlocks({
    cycle,
    googleConnected,
    selectedCalendarId,
    updateCycle
}: UseDailyBlocksParams) {
    const addBlock = async (date: string, draft: DailyBlockDraft): Promise<boolean> => {
        if (!draft.title.trim()) return false;

        const newBlock: DailyBlock = {
            id: uid(),
            startTime: draft.startTime,
            endTime: draft.endTime,
            title: draft.title.trim(),
            linkedTargetId: draft.linkedTargetId || undefined,
            done: false,
            amount: draft.amount ? clamp(draft.amount, 1, 9999) : undefined,
            actual: draft.actual ? clamp(draft.actual, 0, 9999) : 0
        };

        if (googleConnected) {
            try {
                const eventId = await createCalendarEvent(
                    newBlock.title,
                    date,
                    newBlock.startTime,
                    newBlock.endTime,
                    "12-Week-Year Block",
                    selectedCalendarId
                );
                if (eventId) {
                    newBlock.googleEventId = eventId;
                }
            } catch (err) {
                console.error("Failed to create calendar event:", err);
            }
        }

        updateCycle((prev) => {
            const blocks = prev.dailyPlans[date] ?? [];
            return { ...prev, dailyPlans: { ...prev.dailyPlans, [date]: [...blocks, newBlock] } };
        });

        return true;
    };

    const updateBlock = async (date: string, blockId: Id, changes: Partial<DailyBlock>) => {
        const currentBlocks = cycle?.dailyPlans[date] ?? [];
        const block = currentBlocks.find((item) => item.id === blockId);

        if (googleConnected && block?.googleEventId && (changes.startTime || changes.endTime || changes.title)) {
            try {
                await updateCalendarEvent(
                    block.googleEventId,
                    changes.title ?? block.title,
                    date,
                    changes.startTime ?? block.startTime,
                    changes.endTime ?? block.endTime,
                    "12-Week-Year Block",
                    selectedCalendarId
                );
            } catch (err) {
                console.error("Failed to update calendar event:", err);
            }
        }

        updateCycle((prev) => {
            const blocks = prev.dailyPlans[date] ?? [];
            return {
                ...prev,
                dailyPlans: {
                    ...prev.dailyPlans,
                    [date]: blocks.map((item) => (item.id === blockId ? { ...item, ...changes } : item))
                }
            };
        });
    };

    const deleteBlock = async (date: string, blockId: Id) => {
        const currentBlocks = cycle?.dailyPlans[date] ?? [];
        const block = currentBlocks.find((item) => item.id === blockId);

        if (googleConnected && block?.googleEventId) {
            try {
                await deleteCalendarEvent(block.googleEventId, selectedCalendarId);
            } catch (err) {
                console.error("Failed to delete calendar event:", err);
            }
        }

        updateCycle((prev) => {
            const blocks = prev.dailyPlans[date] ?? [];
            return {
                ...prev,
                dailyPlans: {
                    ...prev.dailyPlans,
                    [date]: blocks.filter((item) => item.id !== blockId)
                }
            };
        });
    };

    const reorderBlocks = (date: string, fromIndex: number, toIndex: number) => {
        updateCycle((prev) => {
            const blocks = [...(prev.dailyPlans[date] ?? [])];
            if (!canReorderIndices({ fromIndex, toIndex, length: blocks.length })) {
                return prev;
            }
            const [moved] = blocks.splice(fromIndex, 1);
            if (!moved) return prev;
            blocks.splice(toIndex, 0, moved);
            return {
                ...prev,
                dailyPlans: { ...prev.dailyPlans, [date]: blocks }
            };
        });
    };

    return {
        addBlock,
        updateBlock,
        deleteBlock,
        reorderBlocks
    };
}
