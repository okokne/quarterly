import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    LocalSnapshotMeta,
    PersistedPlannerState,
    STATE_WRITE_TS_STORAGE_KEY
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
};

export function usePlannerPersistence({ state, applyState }: UsePlannerPersistenceParams) {
    const [snapshotMetas, setSnapshotMetas] = useState<LocalSnapshotMeta[]>(() => listSnapshotMetas());
    const [recoveryCandidate, setRecoveryCandidate] = useState<LocalSnapshotMeta | null>(null);
    const [persistenceWarning, setPersistenceWarning] = useState<string | null>(null);

    const lastSerializedRef = useRef<string | null>(null);
    const localWriteTsRef = useRef<number>(readStateWriteTs());

    const refreshMetas = useCallback(() => {
        setSnapshotMetas(listSnapshotMetas());
    }, []);

    useEffect(() => {
        const health = isStorageHealthOk();
        if (!health.ok && health.error) {
            setPersistenceWarning(formatStorageError(health.error));
        }
    }, []);

    useEffect(() => {
        const latest = getLatestSnapshotRecord();
        if (!latest) return;
        if (!hasMeaningfulPlannerData(state) && hasMeaningfulPlannerData(latest.payload)) {
            const { snapshotId, createdAt, bytes } = latest;
            setRecoveryCandidate({ snapshotId, createdAt, bytes });
        }
    }, [state]);

    useEffect(() => {
        const serialized = safeSerialize(state);
        if (!serialized.ok) {
            setPersistenceWarning(formatStorageError(serialized.error));
            return;
        }
        if (lastSerializedRef.current === serialized.json) {
            return;
        }
        lastSerializedRef.current = serialized.json;

        const snapshotResult = createAutoSnapshot(state);
        if (snapshotResult.error) {
            setPersistenceWarning(formatStorageError(snapshotResult.error));
            return;
        }
        refreshMetas();

        const ts = Date.now();
        const tsError = stampStateWriteTs(ts);
        if (tsError) {
            setPersistenceWarning(formatStorageError(tsError));
            return;
        }
        localWriteTsRef.current = ts;
    }, [state, refreshMetas]);

    useEffect(() => {
        const handleStorage = (event: StorageEvent) => {
            if (event.key !== STATE_WRITE_TS_STORAGE_KEY || !event.newValue) return;
            const incomingTs = Number(event.newValue);
            if (!Number.isFinite(incomingTs)) return;
            if (incomingTs <= localWriteTsRef.current) return;

            localWriteTsRef.current = incomingTs;
            const nextState = readPersistedPlannerStateFromLocalStorage(state.preferences);
            applyState(nextState);
            refreshMetas();
        };

        window.addEventListener("storage", handleStorage);
        return () => window.removeEventListener("storage", handleStorage);
    }, [applyState, refreshMetas, state.preferences]);

    const restoreSnapshot = useCallback((snapshotId?: string): boolean => {
        const record = snapshotId
            ? getSnapshotRecordById(snapshotId)
            : getLatestSnapshotRecord();
        if (!record) return false;

        const writeError = writePersistedPlannerStateToLocalStorage(record.payload);
        if (writeError) {
            setPersistenceWarning(formatStorageError(writeError));
            return false;
        }

        applyState(record.payload);
        setRecoveryCandidate(null);
        refreshMetas();

        const ts = Date.now();
        const tsError = stampStateWriteTs(ts);
        if (!tsError) {
            localWriteTsRef.current = ts;
        }
        return true;
    }, [applyState, refreshMetas]);

    const downloadSnapshot = useCallback((snapshotId?: string): boolean => {
        const record = snapshotId
            ? getSnapshotRecordById(snapshotId)
            : getLatestSnapshotRecord();
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
        a.download = `12-week-year-autosnapshot-${record.createdAt.slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        return true;
    }, []);

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
