import { MutableRefObject, useCallback } from "react";
import { clearOfflineDirty } from "../sync/offlineOutbox";
import { pushPlannerStateToCloud, resolveConflictState } from "../sync/plannerSync";
import { downloadJson } from "../sync/downloadJson";
import { safeSerialize } from "../persistence/stateSerializer";
import { PersistedPlannerState, StorageScope, SyncConflictResolution, SyncStatus } from "../types";
import { SupabaseAuthSession } from "../sync/supabaseClient";

type UsePlannerSyncConflictResolutionParams = {
    session: SupabaseAuthSession | null;
    state: PersistedPlannerState;
    conflictCloudState: PersistedPlannerState | null;
    onApplyRemoteState: (state: PersistedPlannerState) => void;
    cloudVersionRef: MutableRefObject<number>;
    skipNextPushRef: MutableRefObject<boolean>;
    storageScope: StorageScope;
    setAuthMessage: (message: string | null) => void;
    setPendingConflict: (value: boolean) => void;
    setConflictCloudState: (value: PersistedPlannerState | null) => void;
    setHasPendingLocalChanges: (value: boolean) => void;
    setSyncStatus: (status: SyncStatus) => void;
    setSyncError: (message: string | null) => void;
};

export function usePlannerSyncConflictResolution({
    session,
    state,
    conflictCloudState,
    onApplyRemoteState,
    cloudVersionRef,
    skipNextPushRef,
    storageScope,
    setAuthMessage,
    setPendingConflict,
    setConflictCloudState,
    setHasPendingLocalChanges,
    setSyncStatus,
    setSyncError
}: UsePlannerSyncConflictResolutionParams) {
    return useCallback(async (resolution: SyncConflictResolution): Promise<boolean> => {
        if (!session || !conflictCloudState) return false;
        if (resolution === "export_both") {
            const local = safeSerialize(state);
            const cloud = safeSerialize(conflictCloudState);
            if (local.ok) {
                downloadJson("planner-conflict-local.json", local.json);
            }
            if (cloud.ok) {
                downloadJson("planner-conflict-cloud.json", cloud.json);
            }
            setAuthMessage("Conflict files exported. Choose local or cloud afterwards.");
            return true;
        }

        const resolved = resolveConflictState({
            local: state,
            cloud: {
                userId: session.user.id,
                state: conflictCloudState,
                version: 1,
                updatedAt: new Date().toISOString(),
                schemaVersion: 1
            },
            resolution
        });

        if (resolution === "keep_cloud") {
            skipNextPushRef.current = true;
            onApplyRemoteState(resolved);
        }

        const pushed = await pushPlannerStateToCloud({
            session,
            state: resolved,
            previousVersion: cloudVersionRef.current > 0 ? cloudVersionRef.current : undefined
        });
        if (pushed.error) {
            setSyncStatus("error");
            setSyncError(pushed.error);
            return false;
        }
        if (pushed.record?.version) {
            cloudVersionRef.current = pushed.record.version;
        }
        setPendingConflict(false);
        setConflictCloudState(null);
        setHasPendingLocalChanges(false);
        clearOfflineDirty(storageScope);
        setSyncStatus("synced");
        return true;
    }, [
        cloudVersionRef,
        conflictCloudState,
        onApplyRemoteState,
        session,
        setAuthMessage,
        setConflictCloudState,
        setHasPendingLocalChanges,
        setPendingConflict,
        setSyncError,
        setSyncStatus,
        skipNextPushRef,
        state,
        storageScope
    ]);
}
