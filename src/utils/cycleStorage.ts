import { STORAGE_KEY, Cycle } from "../types";
import { getActiveStorageScope, readScopedStorageValue, writeScopedStorageValue } from "../persistence/storageScope";

export function loadCycle(): Cycle | null {
    const raw = readScopedStorageValue(STORAGE_KEY, getActiveStorageScope());
    if (!raw) return null;
    try {
        return JSON.parse(raw) as Cycle;
    } catch {
        return null;
    }
}

export function saveCycle(cycle: Cycle | null): void {
    if (!cycle) return;
    try {
        writeScopedStorageValue(STORAGE_KEY, getActiveStorageScope(), JSON.stringify(cycle));
    } catch (error) {
        console.error("Failed to persist cycle:", error);
    }
}
