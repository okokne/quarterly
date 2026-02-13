import { useEffect, useMemo, useState } from "react";
import { Cycle, HISTORY_STORAGE_KEY, Id, StorageScope } from "../types";
import { readScopedStorageValue, writeScopedStorageValue } from "../persistence/storageScope";

function readHistory(scope: StorageScope): Cycle[] {
    const raw = readScopedStorageValue(HISTORY_STORAGE_KEY, scope);
    if (!raw) return [];
    try {
        return JSON.parse(raw) as Cycle[];
    } catch {
        return [];
    }
}

type UseArchiveHistoryParams = {
    activeCycle: Cycle | null;
    storageScope: StorageScope;
};

export function useArchiveHistory({ activeCycle, storageScope }: UseArchiveHistoryParams) {
    const [history, setHistory] = useState<Cycle[]>(() => readHistory(storageScope));
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
            writeScopedStorageValue(HISTORY_STORAGE_KEY, storageScope, JSON.stringify(history));
        } catch (err) {
            console.error("Failed to persist history:", err);
        }
    }, [history, storageScope]);

    return {
        history,
        setHistory,
        viewingArchiveId,
        setViewingArchiveId,
        isArchiveView,
        cycle
    };
}
