import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    BootstrapStatus,
    PersistedPlannerState,
    StorageScope,
    SyncSource,
    SyncStatus
} from "../types";
import { readPersistedPlannerStateFromLocalStorage, safeSerialize } from "../persistence/stateSerializer";
import { bootstrapAfterLogin } from "../sync/bootstrap";
import { clearOfflineDirty, hasOfflineDirtyChanges, markOfflineDirty } from "../sync/offlineOutbox";
import {
    deleteCloudPlannerState,
    PlannerStateRecord,
    pushPlannerStateToCloud,
    resolveInitialSyncAction
} from "../sync/plannerSync";
import {
    deleteSupabaseUser,
    getMagicLinkRedirectTarget,
    hasSupabaseConfig,
    SupabaseAuthSession
} from "../sync/supabaseClient";
import { readStateWriteTs } from "../persistence/localSnapshots";
import { debugSync } from "../sync/syncDebug";
import { isSyncEnabledByConfig } from "../sync/syncConfig";
import { usePlannerSyncAuthRequests } from "./usePlannerSyncAuthRequests";
import { usePlannerSyncConflictResolution } from "./usePlannerSyncConflictResolution";
import { usePlannerSyncInitialSession } from "./usePlannerSyncInitialSession";
import { usePlannerSyncNetworkEffects } from "./usePlannerSyncNetworkEffects";
import { usePlannerSyncRequestNow } from "./usePlannerSyncRequestNow";
import { usePlannerSyncSignOut } from "./usePlannerSyncSignOut";

const SYNC_ENABLED = isSyncEnabledByConfig();

type UsePlannerSyncParams = {
    state: PersistedPlannerState;
    onApplyRemoteState: (state: PersistedPlannerState) => void;
    storageScope: StorageScope;
    onStorageScopeChange: (scope: StorageScope) => void;
};

function buildEmptyState(preferences: PersistedPlannerState["preferences"]): PersistedPlannerState {
    return {
        cycle: null,
        templates: [],
        history: [],
        habits: [],
        habitLog: {},
        preferences
    };
}

export function usePlannerSync({
    state,
    onApplyRemoteState,
    storageScope,
    onStorageScopeChange
}: UsePlannerSyncParams) {
    const [session, setSession] = useState<SupabaseAuthSession | null>(null);
    const [initialSyncReady, setInitialSyncReady] = useState(false);
    const [bootstrapStatus, setBootstrapStatus] = useState<BootstrapStatus>("idle");
    const [lastBootstrapSource, setLastBootstrapSource] = useState<SyncSource>("none");
    const [authLoading, setAuthLoading] = useState(false);
    const [authError, setAuthError] = useState<string | null>(null);
    const [authMessage, setAuthMessage] = useState<string | null>(null);
    const [syncError, setSyncError] = useState<string | null>(null);
    const [pendingConflict, setPendingConflict] = useState(false);
    const [conflictCloudState, setConflictCloudState] = useState<PersistedPlannerState | null>(null);
    const [hasPendingLocalChanges, setHasPendingLocalChanges] = useState(false);
    const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
    const debounceTimerRef = useRef<number | null>(null);
    const skipNextPushRef = useRef(false);
    const lastSyncedSerializedRef = useRef<string | null>(null);
    const initialSyncDoneForUserRef = useRef<string | null>(null);
    const cloudVersionRef = useRef<number>(0);

    const [syncStatus, setSyncStatus] = useState<SyncStatus>(() => {
        if (!SYNC_ENABLED) return "idle";
        if (!navigator.onLine) return "offline";
        return "idle";
    });
    const [onlineTick, setOnlineTick] = useState(0);
    const previousSyncStatusRef = useRef<SyncStatus>(syncStatus);

    const syncEnabled = SYNC_ENABLED && hasSupabaseConfig();
    const magicLinkRedirect = getMagicLinkRedirectTarget();
    const activeScope = storageScope;
    const sessionUserId = session?.user.id ?? null;
    const syncDisabledError = "Sync ist deaktiviert. Bitte VITE_SYNC_ENABLED und Supabase-Variablen pruefen.";
    const statePreferences = useMemo(() => ({
        darkMode: state.preferences.darkMode,
        language: state.preferences.language,
        dateFormat: state.preferences.dateFormat,
        timeFormat: state.preferences.timeFormat,
        selectedCalendarId: state.preferences.selectedCalendarId
    }), [
        state.preferences.darkMode,
        state.preferences.language,
        state.preferences.dateFormat,
        state.preferences.timeFormat,
        state.preferences.selectedCalendarId
    ]);

    const clearAuthFeedback = useCallback(() => {
        setAuthError(null);
        setAuthMessage(null);
    }, []);
    const markSessionSignedIn = useCallback((nextSession: SupabaseAuthSession | null, message: string) => {
        setSession(nextSession);
        setInitialSyncReady(false);
        setBootstrapStatus("restoring");
        setAuthMessage(message);
    }, []);

    const applySyncedState = useCallback((nextState: PersistedPlannerState) => {
        skipNextPushRef.current = true;
        onApplyRemoteState(nextState);
        const serialized = safeSerialize(nextState);
        if (serialized.ok) {
            lastSyncedSerializedRef.current = serialized.json;
        }
        setPendingConflict(false);
        setConflictCloudState(null);
        setHasPendingLocalChanges(false);
    }, [onApplyRemoteState]);

    const attemptAutoConflictResolution = useCallback(async (
        activeSession: SupabaseAuthSession,
        cloudRecord: PlannerStateRecord,
        scope: StorageScope
    ): Promise<boolean> => {
        const localWriteTs = readStateWriteTs(scope);
        const localUpdatedAt = localWriteTs > 0 ? new Date(localWriteTs).toISOString() : null;
        const decision = resolveInitialSyncAction({
            local: state,
            cloud: cloudRecord,
            localUpdatedAt
        });

        if (decision === "push_local") {
            const pushed = await pushPlannerStateToCloud({
                session: activeSession,
                state,
                previousVersion: cloudRecord.version
            });
            if (!pushed.error && pushed.record?.version) {
                cloudVersionRef.current = pushed.record.version;
                const serialized = safeSerialize(state);
                if (serialized.ok) {
                    lastSyncedSerializedRef.current = serialized.json;
                }
                setPendingConflict(false);
                setConflictCloudState(null);
                setHasPendingLocalChanges(false);
                clearOfflineDirty(scope);
                return true;
            }
        }

        if (cloudRecord.version) {
            cloudVersionRef.current = cloudRecord.version;
        }
        applySyncedState(cloudRecord.state);
        clearOfflineDirty(scope);
        return true;
    }, [applySyncedState, state]);

    const runBootstrapForSession = useCallback(async (activeSession: SupabaseAuthSession): Promise<boolean> => {
        const userScope = activeSession.user.id;
        setBootstrapStatus("restoring");
        setInitialSyncReady(false);
        setSyncStatus("syncing");
        setSyncError(null);

        debugSync("login_success", {
            userId: userScope,
            token_last4: activeSession.access_token.slice(-4),
            expiresAt: activeSession.expires_at ?? null
        });

        const localScopedState = readPersistedPlannerStateFromLocalStorage(statePreferences, userScope);
        debugSync("bootstrap_start", {
            userId: userScope,
            scope: userScope,
            localHasCycle: !!localScopedState.cycle,
            localHistoryCount: localScopedState.history.length
        });
        const bootstrap = await bootstrapAfterLogin({
            session: activeSession,
            localScopedState
        });

        if (!bootstrap.ok) {
            setBootstrapStatus("error");
            setSyncStatus("error");
            setSyncError(bootstrap.error ?? "Initial bootstrap failed.");
            debugSync("bootstrap_done", {
                ok: false,
                error: bootstrap.error ?? "unknown"
            });
            return false;
        }

        debugSync("bootstrap_decision", {
            userId: userScope,
            decision: bootstrap.decision,
            source: bootstrap.source,
            cloudVersion: bootstrap.record?.version ?? null
        });

        onStorageScopeChange(userScope);
        setLastBootstrapSource(bootstrap.source);

        const nextState = bootstrap.state ?? buildEmptyState(localScopedState.preferences);
        applySyncedState(nextState);
        debugSync("after_login_state", {
            userId: userScope,
            dataSource: bootstrap.source,
            activeWorkspaceId: userScope,
            guestScope: false,
            hasCycle: !!nextState.cycle
        });

        if (bootstrap.record?.version) {
            cloudVersionRef.current = bootstrap.record.version;
        }
        initialSyncDoneForUserRef.current = userScope;
        setBootstrapStatus("ready");
        setInitialSyncReady(true);
        setSyncStatus("synced");
        clearOfflineDirty(userScope);

        debugSync("bootstrap_done", {
            ok: true,
            source: bootstrap.source,
            stateSections: {
                cycle: !!nextState.cycle,
                history: nextState.history.length,
                templates: nextState.templates.length,
                habits: nextState.habits.length
            }
        });

        return true;
    }, [applySyncedState, onStorageScopeChange, statePreferences]);

    usePlannerSyncInitialSession({
        syncEnabled,
        markSessionSignedIn,
        setSession,
        setHasPendingLocalChanges,
        setInitialSyncReady,
        setBootstrapStatus,
        setAuthError
    });

    useEffect(() => {
        if (magicLinkRedirect.error) {
            setAuthError(magicLinkRedirect.error);
        }
    }, [magicLinkRedirect.error]);

    usePlannerSyncNetworkEffects({
        syncFeatureEnabled: SYNC_ENABLED,
        setSyncStatus,
        setOnlineTick
    });

    useEffect(() => {
        if (syncStatus === "synced" && previousSyncStatusRef.current !== "synced") {
            setLastSyncedAt(new Date().toISOString());
        }
        previousSyncStatusRef.current = syncStatus;
    }, [syncStatus]);

    useEffect(() => {
        if (!syncEnabled) {
            setBootstrapStatus("idle");
            setInitialSyncReady(false);
            return;
        }

        if (!sessionUserId || !session) {
            initialSyncDoneForUserRef.current = null;
            cloudVersionRef.current = 0;
            setBootstrapStatus("ready");
            setInitialSyncReady(true);
            setLastBootstrapSource("guest");
            if (storageScope !== "guest") {
                onStorageScopeChange("guest");
            }
            applySyncedState(readPersistedPlannerStateFromLocalStorage(statePreferences, "guest"));
            setSyncStatus(navigator.onLine ? "idle" : "offline");
            clearOfflineDirty("guest");
            return;
        }

        if (
            initialSyncDoneForUserRef.current === sessionUserId
            && bootstrapStatus === "ready"
            && storageScope === sessionUserId
        ) {
            return;
        }

        let cancelled = false;
        void (async () => {
            const ok = await runBootstrapForSession(session);
            if (cancelled || !ok) return;
        })();
        return () => {
            cancelled = true;
        };
    }, [
        applySyncedState,
        bootstrapStatus,
        onStorageScopeChange,
        runBootstrapForSession,
        session,
        sessionUserId,
        statePreferences,
        storageScope,
        syncEnabled
    ]);

    const requestSyncNow = usePlannerSyncRequestNow({
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
    });

    useEffect(() => {
        if (!syncEnabled) return;
        const serialized = safeSerialize(state);
        if (!serialized.ok) {
            setSyncStatus("error");
            setSyncError(serialized.error.message);
            return;
        }
        if (serialized.json === lastSyncedSerializedRef.current) {
            setHasPendingLocalChanges(false);
            return;
        }

        setHasPendingLocalChanges(true);
        if (!session || bootstrapStatus !== "ready" || storageScope !== session.user.id) {
            return;
        }
        if (!navigator.onLine) {
            setSyncStatus("offline");
            markOfflineDirty(storageScope);
            return;
        }
        if (skipNextPushRef.current) {
            skipNextPushRef.current = false;
            return;
        }

        if (debounceTimerRef.current !== null) {
            window.clearTimeout(debounceTimerRef.current);
        }
        debounceTimerRef.current = window.setTimeout(() => {
            void requestSyncNow();
        }, 800);

        return () => {
            if (debounceTimerRef.current !== null) {
                window.clearTimeout(debounceTimerRef.current);
                debounceTimerRef.current = null;
            }
        };
    }, [bootstrapStatus, requestSyncNow, session, state, storageScope, syncEnabled]);

    useEffect(() => {
        if (!syncEnabled || !session) return;
        if (bootstrapStatus !== "ready" || storageScope !== session.user.id) return;
        if (!navigator.onLine) return;
        const hasDirtyOutbox = hasOfflineDirtyChanges(storageScope);
        if (!hasPendingLocalChanges && !hasDirtyOutbox) return;
        debugSync("sync_reconnect_flush", {
            userId: session.user.id,
            hasPendingLocalChanges,
            hasDirtyOutbox
        });
        void requestSyncNow();
    }, [
        bootstrapStatus,
        hasPendingLocalChanges,
        onlineTick,
        requestSyncNow,
        session,
        storageScope,
        syncEnabled
    ]);

    const { signUp, signIn, checkEmailAccount, requestOneTimeCode, verifyOneTimeCode, requestMagicLink } = usePlannerSyncAuthRequests({
        syncEnabled,
        syncDisabledError,
        magicLinkRedirectUrl: magicLinkRedirect.url,
        clearAuthFeedback,
        markSessionSignedIn,
        setAuthLoading,
        setAuthError,
        setAuthMessage
    });

    const signOut = usePlannerSyncSignOut({
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
    });

    const deleteAccount = useCallback(async (): Promise<boolean> => {
        if (!syncEnabled || !session) {
            setAuthError(syncDisabledError);
            return false;
        }

        clearAuthFeedback();
        setAuthLoading(true);

        const cloudDelete = await deleteCloudPlannerState(session);
        if (cloudDelete.error) {
            setAuthLoading(false);
            setAuthError(cloudDelete.error);
            return false;
        }

        const authDelete = await deleteSupabaseUser(session);
        if (authDelete.error) {
            setAuthLoading(false);
            setAuthError(authDelete.error);
            return false;
        }

        setAuthLoading(false);
        await signOut();
        return true;
    }, [
        clearAuthFeedback,
        session,
        setAuthError,
        setAuthLoading,
        signOut,
        syncDisabledError,
        syncEnabled
    ]);

    const resolveSyncConflict = usePlannerSyncConflictResolution({
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
    });

    const cloudEmail = session?.user.email ?? null;
    const pendingLocalChangesCount = (hasPendingLocalChanges || hasOfflineDirtyChanges(storageScope)) ? 1 : 0;
    const isOnline = typeof navigator === "undefined" ? true : navigator.onLine;

    return {
        syncEnabled,
        syncStatus,
        requestSyncNow,
        initialSyncReady,
        bootstrapStatus,
        activeScope,
        lastBootstrapSource,
        isAuthenticated: !!session,
        authLoading,
        authError,
        authMessage,
        magicLinkRedirectUrl: magicLinkRedirect.url,
        magicLinkRedirectError: magicLinkRedirect.error,
        cloudEmail,
        syncError,
        pendingConflict,
        pendingLocalChangesCount,
        lastSyncedAt,
        isOnline,
        signUp,
        signIn,
        checkEmailAccount,
        requestOneTimeCode,
        verifyOneTimeCode,
        requestMagicLink,
        signOut,
        deleteAccount,
        resolveSyncConflict
    };
}
