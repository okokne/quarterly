import { useCallback, useEffect, useRef, useState } from "react";
import {
    BootstrapStatus,
    PersistedPlannerState,
    StorageScope,
    SyncConflictResolution,
    SyncSource,
    SyncStatus
} from "../types";
import { readPersistedPlannerStateFromLocalStorage, safeSerialize } from "../persistence/stateSerializer";
import { bootstrapAfterLogin } from "../sync/bootstrap";
import { clearOfflineDirty, hasOfflineDirtyChanges, markOfflineDirty } from "../sync/offlineOutbox";
import {
    PlannerStateRecord,
    pushPlannerStateToCloud,
    resolveConflictState,
    resolveInitialSyncAction,
    syncPlannerState
} from "../sync/plannerSync";
import {
    consumeSupabaseSessionFromUrl,
    clearStoredSupabaseSession,
    getMagicLinkRedirectTarget,
    hasSupabaseConfig,
    isSupabaseSessionExpired,
    readStoredSupabaseSession,
    refreshSupabaseSession,
    signInWithEmailPassword,
    signInWithMagicLink,
    signOutSupabase,
    signUpWithEmailPassword,
    SupabaseAuthSession
} from "../sync/supabaseClient";
import { readStateWriteTs } from "../persistence/localSnapshots";
import { debugSync } from "../sync/syncDebug";

declare const __VITE_SYNC_ENABLED__: string | undefined;

function readSyncEnabledRawValue(): string | undefined {
    if (typeof __VITE_SYNC_ENABLED__ === "string" && __VITE_SYNC_ENABLED__.trim()) {
        return __VITE_SYNC_ENABLED__;
    }

    const runtimeEnv = (globalThis as unknown as {
        __TWY_ENV__?: Record<string, string | undefined>;
        __VITE_SYNC_ENABLED__?: string;
        __SYNC_ENABLED__?: string;
        process?: { env?: Record<string, string | undefined> };
    });
    if (typeof runtimeEnv.__TWY_ENV__?.VITE_SYNC_ENABLED === "string") return runtimeEnv.__TWY_ENV__.VITE_SYNC_ENABLED;
    if (typeof runtimeEnv.__TWY_ENV__?.SYNC_ENABLED === "string") return runtimeEnv.__TWY_ENV__.SYNC_ENABLED;
    if (typeof runtimeEnv.__VITE_SYNC_ENABLED__ === "string") return runtimeEnv.__VITE_SYNC_ENABLED__;
    if (typeof runtimeEnv.__SYNC_ENABLED__ === "string") return runtimeEnv.__SYNC_ENABLED__;

    const processEnv = runtimeEnv.process?.env ?? (globalThis as unknown as {
        process?: { env?: Record<string, string | undefined> };
    }).process?.env;
    return processEnv?.VITE_SYNC_ENABLED ?? processEnv?.SYNC_ENABLED;
}

function isExplicitlyDisabled(value: string | undefined): boolean {
    if (!value) return false;
    const normalized = value.trim().toLowerCase();
    return normalized === "false"
        || normalized === "0"
        || normalized === "no"
        || normalized === "off"
        || normalized === "disabled";
}

const SYNC_ENABLED = (() => {
    const raw = readSyncEnabledRawValue();
    return !isExplicitlyDisabled(raw);
})();

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

    const syncEnabled = SYNC_ENABLED && hasSupabaseConfig();
    const magicLinkRedirect = getMagicLinkRedirectTarget();
    const activeScope = storageScope;
    const sessionUserId = session?.user.id ?? null;

    const clearAuthFeedback = useCallback(() => {
        setAuthError(null);
        setAuthMessage(null);
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

        const localScopedState = readPersistedPlannerStateFromLocalStorage(state.preferences, userScope);
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
            demoMode: false,
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
    }, [applySyncedState, onStorageScopeChange, state.preferences]);

    const loadSession = useCallback(async () => {
        if (!syncEnabled) {
            setSession(null);
            setHasPendingLocalChanges(false);
            setInitialSyncReady(false);
            setBootstrapStatus("idle");
            return;
        }
        const consumed = await consumeSupabaseSessionFromUrl();
        if (consumed.error) {
            setAuthError(consumed.error);
        }
        if (consumed.session) {
            setSession(consumed.session);
            setAuthMessage("Magic-Link bestaetigt. Du bist eingeloggt.");
            return;
        }
        const stored = readStoredSupabaseSession();
        if (!stored) {
            setSession(null);
            setInitialSyncReady(false);
            return;
        }
        if (!isSupabaseSessionExpired(stored)) {
            setSession(stored);
            return;
        }
        const refreshed = await refreshSupabaseSession(stored);
        if (!refreshed.session || refreshed.error) {
            setSession(null);
            setInitialSyncReady(false);
            return;
        }
        setSession(refreshed.session);
    }, [syncEnabled]);

    useEffect(() => {
        void loadSession();
    }, [loadSession]);

    useEffect(() => {
        if (magicLinkRedirect.error) {
            setAuthError(magicLinkRedirect.error);
        }
    }, [magicLinkRedirect.error]);

    useEffect(() => {
        if (!SYNC_ENABLED) return;
        const toOnline = () => {
            setSyncStatus("idle");
            setOnlineTick((prev) => prev + 1);
        };
        const toOffline = () => setSyncStatus("offline");
        window.addEventListener("online", toOnline);
        window.addEventListener("offline", toOffline);
        return () => {
            window.removeEventListener("online", toOnline);
            window.removeEventListener("offline", toOffline);
        };
    }, []);

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
            applySyncedState(readPersistedPlannerStateFromLocalStorage(state.preferences, "guest"));
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
        state.preferences,
        storageScope,
        syncEnabled
    ]);

    const requestSyncNow = useCallback(async () => {
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
        runBootstrapForSession,
        session,
        state,
        storageScope,
        syncEnabled
    ]);

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

    const signUp = useCallback(async (email: string, password: string): Promise<boolean> => {
        if (!syncEnabled) {
            setAuthError("Sync ist deaktiviert. Bitte VITE_SYNC_ENABLED und Supabase-Variablen pruefen.");
            return false;
        }
        clearAuthFeedback();
        setAuthLoading(true);
        const result = await signUpWithEmailPassword({ email, password });
        setAuthLoading(false);
        if (result.error) {
            setAuthError(result.error);
            return false;
        }
        setSession(result.session);
        setInitialSyncReady(false);
        setBootstrapStatus("restoring");
        setAuthMessage("Account created and signed in.");
        return true;
    }, [clearAuthFeedback, syncEnabled]);

    const signIn = useCallback(async (email: string, password: string): Promise<boolean> => {
        if (!syncEnabled) {
            setAuthError("Sync ist deaktiviert. Bitte VITE_SYNC_ENABLED und Supabase-Variablen pruefen.");
            return false;
        }
        clearAuthFeedback();
        setAuthLoading(true);
        const result = await signInWithEmailPassword({ email, password });
        setAuthLoading(false);
        if (result.error || !result.session) {
            setAuthError(result.error ?? "Login failed.");
            return false;
        }
        setSession(result.session);
        setInitialSyncReady(false);
        setBootstrapStatus("restoring");
        setAuthMessage("Signed in.");
        return true;
    }, [clearAuthFeedback, syncEnabled]);

    const requestMagicLink = useCallback(async (email: string): Promise<boolean> => {
        if (!syncEnabled) {
            setAuthError("Sync ist deaktiviert. Bitte VITE_SYNC_ENABLED und Supabase-Variablen pruefen.");
            return false;
        }
        clearAuthFeedback();
        setAuthLoading(true);
        const result = await signInWithMagicLink({
            email,
            redirectTo: magicLinkRedirect.url ?? undefined
        });
        setAuthLoading(false);
        if (result.error) {
            setAuthError(result.error);
            return false;
        }
        setAuthMessage("Magic-Link wurde gesendet. Bitte E-Mail pruefen.");
        return true;
    }, [clearAuthFeedback, magicLinkRedirect.url, syncEnabled]);

    const signOut = useCallback(async () => {
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
        applySyncedState(readPersistedPlannerStateFromLocalStorage(state.preferences, "guest"));
        clearOfflineDirty(storageScope);
        initialSyncDoneForUserRef.current = null;
        cloudVersionRef.current = 0;
    }, [applySyncedState, clearAuthFeedback, onStorageScopeChange, session, state.preferences, storageScope]);

    const resolveSyncConflict = useCallback(async (resolution: SyncConflictResolution): Promise<boolean> => {
        if (!session || !conflictCloudState) return false;
        if (resolution === "export_both") {
            const local = safeSerialize(state);
            const cloud = safeSerialize(conflictCloudState);
            if (local.ok) {
                const blob = new Blob([local.json], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "planner-conflict-local.json";
                a.click();
                URL.revokeObjectURL(url);
            }
            if (cloud.ok) {
                const blob = new Blob([cloud.json], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "planner-conflict-cloud.json";
                a.click();
                URL.revokeObjectURL(url);
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
    }, [conflictCloudState, onApplyRemoteState, session, state, storageScope]);

    const cloudEmail = session?.user.email ?? null;

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
        signUp,
        signIn,
        requestMagicLink,
        signOut,
        resolveSyncConflict
    };
}
