import { useEffect, useMemo, useState } from "react";
import { Cycle, HISTORY_STORAGE_KEY, Id } from "../types";

function readHistory(): Cycle[] {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    try {
        return JSON.parse(raw) as Cycle[];
    } catch {
        return [];
    }
}

type UseArchiveHistoryParams = {
    activeCycle: Cycle | null;
};

export function useArchiveHistory({ activeCycle }: UseArchiveHistoryParams) {
    const [history, setHistory] = useState<Cycle[]>(readHistory);
    const [viewingArchiveId, setViewingArchiveId] = useState<Id | null>(null);
    const isArchiveView = viewingArchiveId !== null;

    const cycle = useMemo(() => {
        if (viewingArchiveId) {
            return history.find((entry) => entry.id === viewingArchiveId) ?? null;
        }
        return activeCycle;
    }, [activeCycle, history, viewingArchiveId]);

    useEffect(() => {
        try {
            localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
        } catch (err) {
            console.error("Failed to persist history:", err);
        }
    }, [history]);

    return {
        history,
        setHistory,
        viewingArchiveId,
        setViewingArchiveId,
        isArchiveView,
        cycle
    };
}
