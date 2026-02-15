import { createCalendarEvent, deleteCalendarEvent, updateCalendarEvent } from "../googleCalendar";
import { Cycle, DailyBlock, Id } from "../types";
import { clamp, uid } from "../utils";
import { canReorderIndices } from "../regressionLogic";

export type DailyBlockDraft = {
    startTime: string;
    endTime: string;
    isFlexible: boolean;
    title: string;
    linkedTargetId: string;
    amount: number;
    actual: number;
};

export function createDefaultDailyBlockDraft(): DailyBlockDraft {
    return {
        startTime: "",
        endTime: "",
        isFlexible: true,
        title: "",
        linkedTargetId: "",
        amount: 1,
        actual: 0
    };
}

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
        if (!draft.isFlexible && (!draft.startTime || !draft.endTime)) return false;

        const isFlexible = draft.isFlexible;

        const newBlock: DailyBlock = {
            id: uid(),
            startTime: isFlexible ? null : draft.startTime,
            endTime: isFlexible ? null : draft.endTime,
            isFlexible: isFlexible ? true : undefined,
            title: draft.title.trim(),
            linkedTargetId: draft.linkedTargetId || undefined,
            done: false,
            amount: draft.amount ? clamp(draft.amount, 1, 9999) : undefined,
            actual: draft.actual ? clamp(draft.actual, 0, 9999) : 0
        };

        if (googleConnected && !isFlexible && newBlock.startTime && newBlock.endTime) {
            try {
                const eventId = await createCalendarEvent(
                    newBlock.title,
                    date,
                    newBlock.startTime,
                    newBlock.endTime,
                    "Quarterly Plan Block",
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
        if (!block) return;

        const merged = { ...block, ...changes };
        const nextIsFlexible = merged.isFlexible === true || !merged.startTime || !merged.endTime;
        const nextStartTime = nextIsFlexible ? null : merged.startTime;
        const nextEndTime = nextIsFlexible ? null : merged.endTime;
        const nextTitle = merged.title;
        let nextGoogleEventId = nextIsFlexible ? undefined : block.googleEventId;

        if (googleConnected) {
            if (nextIsFlexible || !nextStartTime || !nextEndTime) {
                if (block.googleEventId) {
                    try {
                        await deleteCalendarEvent(block.googleEventId, selectedCalendarId);
                    } catch (err) {
                        console.error("Failed to delete calendar event:", err);
                    }
                    nextGoogleEventId = undefined;
                }
            } else if (block.googleEventId) {
                try {
                    await updateCalendarEvent(
                        block.googleEventId,
                        nextTitle,
                        date,
                        nextStartTime,
                        nextEndTime,
                        "Quarterly Plan Block",
                        selectedCalendarId
                    );
                } catch (err) {
                    console.error("Failed to update calendar event:", err);
                }
            } else {
                try {
                    const createdEventId = await createCalendarEvent(
                        nextTitle,
                        date,
                        nextStartTime,
                        nextEndTime,
                        "Quarterly Plan Block",
                        selectedCalendarId
                    );
                    if (createdEventId) {
                        nextGoogleEventId = createdEventId;
                    }
                } catch (err) {
                    console.error("Failed to create calendar event:", err);
                }
            }
        }

        updateCycle((prev) => {
            const blocks = prev.dailyPlans[date] ?? [];
            return {
                ...prev,
                dailyPlans: {
                    ...prev.dailyPlans,
                    [date]: blocks.map((item) => (
                        item.id === blockId
                            ? {
                                ...item,
                                ...changes,
                                startTime: nextStartTime,
                                endTime: nextEndTime,
                                isFlexible: nextIsFlexible ? true : undefined,
                                googleEventId: nextGoogleEventId
                            }
                            : item
                    ))
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
