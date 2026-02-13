import { useCallback } from "react";
import { readStateWriteTs } from "../persistence/localSnapshots";
import { safeSerialize } from "../persistence/stateSerializer";
import { clearOfflineDirty, markOfflineDirty } from "../sync/offlineOutbox";
import { PlannerStateRecord, syncPlannerState } from "../sync/plannerSync";
import { PersistedPlannerState, StorageScope, SyncStatus } from "../types";
import { SupabaseAuthSession } from "../sync/supabaseClient";

type UsePlannerSyncRequestNowParams = {
    syncEnabled: boolean;
    session: SupabaseAuthSession | null;
    state: PersistedPlannerState;
    storageScope: StorageScope;
    bootstrapStatus: "idle" | "restoring" | "ready" | "error";
    setSyncStatus: (status: SyncStatus) => void;
    setSyncError: (message: string | null) => void;
    setPendingConflict: (value: boolean) => void;
    setConflictCloudState: (state: PersistedPlannerState | null) => void;
    setHasPendingLocalChanges: (value: boolean) => void;
    lastSyncedSerializedRef: { current: string | null };
    cloudVersionRef: { current: number };
    runBootstrapForSession: (session: SupabaseAuthSession) => Promise<boolean>;
    applySyncedState: (state: PersistedPlannerState) => void;
    attemptAutoConflictResolution: (
        session: SupabaseAuthSession,
        cloudRecord: PlannerStateRecord,
        scope: StorageScope
    ) => Promise<boolean>;
};

export function usePlannerSyncRequestNow({
    syncEnabled,
    session,
    state,
    storageScope,
    bootstrapStatus,
    setSyncStatus,
    setSyncError,
    setPendingConflict,
    setConflictCloudState,
    setHasPendingLocalChanges,
    lastSyncedSerializedRef,
    cloudVersionRef,
    runBootstrapForSession,
    applySyncedState,
    attemptAutoConflictResolution
}: UsePlannerSyncRequestNowParams) {
    return useCallback(async () => {
        if (!syncEnabled || !session) {
            setSyncStatus("idle");
            return false;
        }
        if (bootstrapStatus !== "ready" || storageScope !== session.user.id) {
            const bootstrapOk = await runBootstrapForSession(session);
            if (!bootstrapOk) return false;
        }
        if (!navigator.onLine) {
            setSyncStatus("offline");
            markOfflineDirty(storageScope);
            return false;
        }

        setSyncStatus("syncing");
        setSyncError(null);
        const localWriteTs = readStateWriteTs(storageScope);
        const result = await syncPlannerState({
            session,
            state,
            localUpdatedAt: localWriteTs > 0 ? new Date(localWriteTs).toISOString() : null
        });

        if (!result.ok) {
            if (!navigator.onLine || /network/i.test(result.error ?? "")) {
                markOfflineDirty(storageScope);
                setSyncStatus("offline");
            } else {
                setSyncStatus("error");
            }
            setSyncError(result.error ?? "Sync failed.");
            return false;
        }

        if (result.record?.version) {
            cloudVersionRef.current = result.record.version;
        }

        if (result.action === "pulled" && result.pulledState) {
            applySyncedState(result.pulledState);
            clearOfflineDirty(storageScope);
            setSyncStatus("synced");
            return true;
        }

        if (result.action === "conflict" && result.record) {
            const resolved = await attemptAutoConflictResolution(session, result.record, storageScope);
            if (!resolved) {
                setPendingConflict(true);
                setConflictCloudState(result.record.state);
                setSyncStatus("error");
                setSyncError("Konnte Sync-Konflikt nicht automatisch aufloesen.");
                return false;
            }
            setSyncStatus("synced");
            return true;
        }

        const serialized = safeSerialize(state);
        if (serialized.ok) {
            lastSyncedSerializedRef.current = serialized.json;
        }
        setPendingConflict(false);
        setConflictCloudState(null);
        setHasPendingLocalChanges(false);
        clearOfflineDirty(storageScope);
        setSyncStatus("synced");
        return true;
    }, [
        applySyncedState,
        attemptAutoConflictResolution,
        bootstrapStatus,
        cloudVersionRef,
        lastSyncedSerializedRef,
        runBootstrapForSession,
        session,
        setConflictCloudState,
        setHasPendingLocalChanges,
        setPendingConflict,
        setSyncError,
        setSyncStatus,
        state,
        storageScope,
        syncEnabled
    ]);
}
