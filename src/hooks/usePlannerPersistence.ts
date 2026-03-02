import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    LocalSnapshotMeta,
    PersistedPlannerState,
    STATE_WRITE_TS_STORAGE_KEY,
    StorageScope
} from "../types";
import {
    createAutoSnapshot,
    getLatestSnapshotRecord,
    getSnapshotRecordById,
    isStorageHealthOk,
    listSnapshotMetas,
    readStateWriteTs,
    stampStateWriteTs
} from "../persistence/localSnapshots";
import {
    hasMeaningfulPlannerData,
    readPersistedPlannerStateFromLocalStorage,
    safeSerialize,
    writePersistedPlannerStateToLocalStorage
} from "../persistence/stateSerializer";
import { getScopedStorageKey } from "../persistence/storageScope";

function formatStorageError(error: Error): string {
    const quotaLike = /quota/i.test(error.name) || /quota/i.test(error.message);
    if (quotaLike) {
        return "Lokaler Speicher ist voll. Exportiere deine Daten und loesche alte Browserdaten.";
    }
    return `Lokaler Speicherfehler: ${error.message}`;
}

type UsePlannerPersistenceParams = {
    state: PersistedPlannerState;
    applyState: (state: PersistedPlannerState) => void;
    storageScope: StorageScope;
    suspendWrites?: boolean;
};

export function usePlannerPersistence({
    state,
    applyState,
    storageScope,
    suspendWrites = false
}: UsePlannerPersistenceParams) {
    const [snapshotMetas, setSnapshotMetas] = useState<LocalSnapshotMeta[]>(() => listSnapshotMetas(storageScope));
    const [recoveryCandidate, setRecoveryCandidate] = useState<LocalSnapshotMeta | null>(null);
    const [persistenceWarning, setPersistenceWarning] = useState<string | null>(null);

    const lastSerializedRef = useRef<string | null>(null);
    const localWriteTsRef = useRef<number>(readStateWriteTs(storageScope));
    const didRunInitialPersistRef = useRef(false);

    const refreshMetas = useCallback(() => {
        setSnapshotMetas(listSnapshotMetas(storageScope));
    }, [storageScope]);

    useEffect(() => {
        localWriteTsRef.current = readStateWriteTs(storageScope);
        didRunInitialPersistRef.current = false;
        lastSerializedRef.current = null;
        setRecoveryCandidate(null);
        refreshMetas();
    }, [storageScope, refreshMetas]);

    useEffect(() => {
        const health = isStorageHealthOk();
        if (!health.ok && health.error) {
            setPersistenceWarning(formatStorageError(health.error));
        }
    }, []);

    useEffect(() => {
        const latest = getLatestSnapshotRecord(storageScope);
        if (!latest) return;
        if (!hasMeaningfulPlannerData(state) && hasMeaningfulPlannerData(latest.payload)) {
            const { snapshotId, createdAt, bytes } = latest;
            setRecoveryCandidate({ snapshotId, createdAt, bytes });
        }
    }, [state, storageScope]);

    useEffect(() => {
        if (suspendWrites) return;
        const serialized = safeSerialize(state);
        if (!serialized.ok) {
            setPersistenceWarning(formatStorageError(serialized.error));
            return;
        }

        // Keep scoped primary storage in sync with in-memory state so bootstrap,
        // scope switches, and storage event listeners always read current data.
        const writeError = writePersistedPlannerStateToLocalStorage(state, storageScope);
        if (writeError) {
            setPersistenceWarning(formatStorageError(writeError));
            return;
        }

        // Bootstrapped state should not be treated as a fresh local edit.
        // Otherwise each app start "wins" against newer cloud data by timestamp.
        if (!didRunInitialPersistRef.current) {
            didRunInitialPersistRef.current = true;
            lastSerializedRef.current = serialized.json;
            return;
        }

        if (lastSerializedRef.current === serialized.json) {
            return;
        }
        lastSerializedRef.current = serialized.json;

        const snapshotResult = createAutoSnapshot(state, undefined, storageScope);
        if (snapshotResult.error) {
            setPersistenceWarning(formatStorageError(snapshotResult.error));
            return;
        }
        refreshMetas();

        const ts = Date.now();
        const tsError = stampStateWriteTs(ts, storageScope);
        if (tsError) {
            setPersistenceWarning(formatStorageError(tsError));
            return;
        }
        localWriteTsRef.current = ts;
    }, [state, refreshMetas, storageScope, suspendWrites]);

    useEffect(() => {
        const tsStorageKey = getScopedStorageKey(STATE_WRITE_TS_STORAGE_KEY, storageScope);
        const handleStorage = (event: StorageEvent) => {
            if (event.key !== tsStorageKey || !event.newValue) return;
            const incomingTs = Number(event.newValue);
            if (!Number.isFinite(incomingTs)) return;
            if (incomingTs <= localWriteTsRef.current) return;

            localWriteTsRef.current = incomingTs;
            const nextState = readPersistedPlannerStateFromLocalStorage(state.preferences, storageScope);
            applyState(nextState);
            refreshMetas();
        };

        window.addEventListener("storage", handleStorage);
        return () => window.removeEventListener("storage", handleStorage);
    }, [applyState, refreshMetas, state.preferences, storageScope]);

    const restoreSnapshot = useCallback((snapshotId?: string): boolean => {
        const record = snapshotId
            ? getSnapshotRecordById(snapshotId, storageScope)
            : getLatestSnapshotRecord(storageScope);
        if (!record) return false;

        const writeError = writePersistedPlannerStateToLocalStorage(record.payload, storageScope);
        if (writeError) {
            setPersistenceWarning(formatStorageError(writeError));
            return false;
        }

        applyState(record.payload);
        setRecoveryCandidate(null);
        refreshMetas();

        const ts = Date.now();
        const tsError = stampStateWriteTs(ts, storageScope);
        if (!tsError) {
            localWriteTsRef.current = ts;
        }
        return true;
    }, [applyState, refreshMetas, storageScope]);

    const downloadSnapshot = useCallback((snapshotId?: string): boolean => {
        const record = snapshotId
            ? getSnapshotRecordById(snapshotId, storageScope)
            : getLatestSnapshotRecord(storageScope);
        if (!record) return false;
        const serialized = safeSerialize(record.payload);
        if (!serialized.ok) {
            setPersistenceWarning(formatStorageError(serialized.error));
            return false;
        }
        const blob = new Blob([serialized.json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `quarterly-autosnapshot-${record.createdAt.slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        return true;
    }, [storageScope]);

    const hasSnapshots = useMemo(() => snapshotMetas.length > 0, [snapshotMetas]);

    return {
        snapshotMetas,
        recoveryCandidate,
        hasSnapshots,
        persistenceWarning,
        clearPersistenceWarning: () => setPersistenceWarning(null),
        dismissRecovery: () => setRecoveryCandidate(null),
        restoreSnapshot,
        restoreLatestSnapshot: () => restoreSnapshot(),
        downloadSnapshot,
        downloadLatestSnapshot: () => downloadSnapshot()
    };
}
