import { StorageScope } from "../types";
import { readScopedStorageValue, removeScopedStorageValue, writeScopedStorageValue } from "../persistence/storageScope";

const OFFLINE_DIRTY_KEY = "twy_sync_offline_dirty_v1";

type OfflineDirtyPayload = {
    dirty: boolean;
    updatedAt: string;
};

function parsePayload(raw: string | null): OfflineDirtyPayload | null {
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw) as Partial<OfflineDirtyPayload>;
        if (!parsed || parsed.dirty !== true || typeof parsed.updatedAt !== "string") return null;
        return { dirty: true, updatedAt: parsed.updatedAt };
    } catch {
        return null;
    }
}

export function hasOfflineDirtyChanges(scope: StorageScope): boolean {
    return parsePayload(readScopedStorageValue(OFFLINE_DIRTY_KEY, scope))?.dirty === true;
}

export function markOfflineDirty(scope: StorageScope): void {
    const payload: OfflineDirtyPayload = {
        dirty: true,
        updatedAt: new Date().toISOString()
    };
    try {
        writeScopedStorageValue(OFFLINE_DIRTY_KEY, scope, JSON.stringify(payload));
    } catch {
        // noop
    }
}

export function clearOfflineDirty(scope: StorageScope): void {
    removeScopedStorageValue(OFFLINE_DIRTY_KEY, scope);
}
