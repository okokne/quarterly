import {
    AUTO_SNAPSHOTS_STORAGE_KEY,
    LocalSnapshotMeta,
    LocalSnapshotRecord,
    PersistedPlannerState,
    STATE_WRITE_TS_STORAGE_KEY
} from "../types";
import { safeSerialize } from "./stateSerializer";

export const MAX_AUTO_SNAPSHOTS = 30;

function nowIso(): string {
    return new Date().toISOString();
}

function toSnapshotId(createdAt: string): string {
    return `snap_${createdAt}_${Math.random().toString(36).slice(2, 8)}`;
}

export function buildSnapshotRecord(
    state: PersistedPlannerState,
    createdAt: string = nowIso()
): LocalSnapshotRecord {
    const serialized = safeSerialize(state);
    const bytes = serialized.ok ? new TextEncoder().encode(serialized.json).length : 0;
    return {
        snapshotId: toSnapshotId(createdAt),
        createdAt,
        bytes,
        payload: state
    };
}

export function rotateSnapshots(records: LocalSnapshotRecord[], limit: number = MAX_AUTO_SNAPSHOTS): LocalSnapshotRecord[] {
    const safeLimit = Math.max(1, Math.floor(limit));
    if (records.length <= safeLimit) return records;
    return records.slice(records.length - safeLimit);
}

function readRawSnapshots(): LocalSnapshotRecord[] {
    if (typeof localStorage === "undefined") return [];
    const raw = localStorage.getItem(AUTO_SNAPSHOTS_STORAGE_KEY);
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed
            .filter((entry): entry is LocalSnapshotRecord => {
                if (!entry || typeof entry !== "object") return false;
                return typeof entry.snapshotId === "string"
                    && typeof entry.createdAt === "string"
                    && typeof entry.bytes === "number"
                    && entry.payload !== undefined;
            })
            .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    } catch {
        return [];
    }
}

function writeRawSnapshots(records: LocalSnapshotRecord[]): Error | null {
    if (typeof localStorage === "undefined") return null;
    const serialized = safeSerialize(records);
    if (!serialized.ok) return serialized.error;
    try {
        localStorage.setItem(AUTO_SNAPSHOTS_STORAGE_KEY, serialized.json);
        return null;
    } catch (err) {
        return err instanceof Error ? err : new Error("Unknown snapshot write error");
    }
}

export function createAutoSnapshot(state: PersistedPlannerState, limit: number = MAX_AUTO_SNAPSHOTS): {
    record: LocalSnapshotRecord | null;
    error: Error | null;
} {
    const nextRecord = buildSnapshotRecord(state);
    const current = readRawSnapshots();
    const rotated = rotateSnapshots([...current, nextRecord], limit);
    const error = writeRawSnapshots(rotated);
    if (error) return { record: null, error };
    return { record: nextRecord, error: null };
}

export function listSnapshotRecords(): LocalSnapshotRecord[] {
    return readRawSnapshots();
}

export function listSnapshotMetas(): LocalSnapshotMeta[] {
    return readRawSnapshots().map(({ snapshotId, createdAt, bytes }) => ({ snapshotId, createdAt, bytes }));
}

export function getLatestSnapshotRecord(): LocalSnapshotRecord | null {
    const all = readRawSnapshots();
    if (all.length === 0) return null;
    return all[all.length - 1] ?? null;
}

export function getSnapshotRecordById(snapshotId: string): LocalSnapshotRecord | null {
    return readRawSnapshots().find((entry) => entry.snapshotId === snapshotId) ?? null;
}

export function stampStateWriteTs(ts: number = Date.now()): Error | null {
    if (typeof localStorage === "undefined") return null;
    try {
        localStorage.setItem(STATE_WRITE_TS_STORAGE_KEY, String(ts));
        return null;
    } catch (err) {
        return err instanceof Error ? err : new Error("Unknown write timestamp error");
    }
}

export function readStateWriteTs(): number {
    if (typeof localStorage === "undefined") return 0;
    const raw = localStorage.getItem(STATE_WRITE_TS_STORAGE_KEY);
    if (!raw) return 0;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : 0;
}

export function isStorageHealthOk(): { ok: boolean; error: Error | null } {
    if (typeof localStorage === "undefined") {
        return { ok: false, error: new Error("localStorage unavailable") };
    }
    try {
        const probeKey = "twy_storage_health_probe";
        localStorage.setItem(probeKey, "1");
        localStorage.removeItem(probeKey);
        return { ok: true, error: null };
    } catch (err) {
        return {
            ok: false,
            error: err instanceof Error ? err : new Error("Unknown storage health error")
        };
    }
}
