import { MutableRefObject, useCallback } from "react";
import { readPersistedPlannerStateFromLocalStorage } from "../persistence/stateSerializer";
import { clearOfflineDirty } from "../sync/offlineOutbox";
import { clearStoredSupabaseSession, signOutSupabase, SupabaseAuthSession } from "../sync/supabaseClient";
import { BootstrapStatus, PersistedPlannerState, StorageScope, SyncSource, SyncStatus } from "../types";

type UsePlannerSyncSignOutParams = {
    session: SupabaseAuthSession | null;
    clearAuthFeedback: () => void;
    applySyncedState: (state: PersistedPlannerState) => void;
    statePreferences: PersistedPlannerState["preferences"];
    storageScope: StorageScope;
    onStorageScopeChange: (scope: StorageScope) => void;
    setAuthLoading: (value: boolean) => void;
    setSession: (session: SupabaseAuthSession | null) => void;
    setPendingConflict: (value: boolean) => void;
    setConflictCloudState: (state: PersistedPlannerState | null) => void;
    setSyncStatus: (status: SyncStatus) => void;
    setSyncError: (value: string | null) => void;
    setHasPendingLocalChanges: (value: boolean) => void;
    setInitialSyncReady: (value: boolean) => void;
    setBootstrapStatus: (status: BootstrapStatus) => void;
    setLastBootstrapSource: (source: SyncSource) => void;
    initialSyncDoneForUserRef: MutableRefObject<string | null>;
    cloudVersionRef: MutableRefObject<number>;
};

export function usePlannerSyncSignOut({
    session,
    clearAuthFeedback,
    applySyncedState,
    statePreferences,
    storageScope,
    onStorageScopeChange,
    setAuthLoading,
    setSession,
    setPendingConflict,
    setConflictCloudState,
    setSyncStatus,
    setSyncError,
    setHasPendingLocalChanges,
    setInitialSyncReady,
    setBootstrapStatus,
    setLastBootstrapSource,
    initialSyncDoneForUserRef,
    cloudVersionRef
}: UsePlannerSyncSignOutParams) {
    return useCallback(async () => {
        clearAuthFeedback();
        setAuthLoading(true);
        await signOutSupabase(session);
        setAuthLoading(false);
        clearStoredSupabaseSession();
        setSession(null);
        setPendingConflict(false);
        setConflictCloudState(null);
        setSyncStatus("idle");
        setSyncError(null);
        setHasPendingLocalChanges(false);
        setInitialSyncReady(true);
        setBootstrapStatus("ready");
        setLastBootstrapSource("guest");
        onStorageScopeChange("guest");
        applySyncedState(readPersistedPlannerStateFromLocalStorage(statePreferences, "guest"));
        clearOfflineDirty(storageScope);
        initialSyncDoneForUserRef.current = null;
        cloudVersionRef.current = 0;
    }, [
        applySyncedState,
        clearAuthFeedback,
        cloudVersionRef,
        initialSyncDoneForUserRef,
        onStorageScopeChange,
        session,
        setAuthLoading,
        setBootstrapStatus,
        setConflictCloudState,
        setHasPendingLocalChanges,
        setInitialSyncReady,
        setLastBootstrapSource,
        setPendingConflict,
        setSession,
        setSyncError,
        setSyncStatus,
        statePreferences,
        storageScope
    ]);
}
