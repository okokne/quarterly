import { useCallback, useEffect, useRef, useState } from "react";
import { PersistedPlannerState, SyncConflictResolution, SyncStatus } from "../types";
import {
    CLOUD_VERSION_CONFLICT_ERROR,
    fetchCloudPlannerState,
    pushPlannerStateToCloud,
    resolveConflictState,
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
import { safeSerialize } from "../persistence/stateSerializer";
import { readStateWriteTs } from "../persistence/localSnapshots";

function readSyncEnabledRawValue(): string | undefined {
    const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
    if (typeof env?.VITE_SYNC_ENABLED === "string") return env.VITE_SYNC_ENABLED;

    const runtimeEnv = (globalThis as unknown as {
        __TWY_ENV__?: Record<string, string | undefined>;
        __VITE_SYNC_ENABLED__?: string;
        process?: { env?: Record<string, string | undefined> };
    }).__TWY_ENV__;
    if (typeof runtimeEnv?.VITE_SYNC_ENABLED === "string") return runtimeEnv.VITE_SYNC_ENABLED;

    const constantEnv = (globalThis as unknown as { __VITE_SYNC_ENABLED__?: string }).__VITE_SYNC_ENABLED__;
    if (typeof constantEnv === "string") return constantEnv;

    const processEnv = (globalThis as unknown as {
        process?: { env?: Record<string, string | undefined> };
    }).process?.env;
    return processEnv?.VITE_SYNC_ENABLED;
}

function parseBooleanLike(value: string | undefined): boolean {
    if (!value) return false;
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "1" || normalized === "yes" || normalized === "on";
}

const SYNC_ENABLED = (() => {
    return parseBooleanLike(readSyncEnabledRawValue());
})();

type UsePlannerSyncParams = {
    state: PersistedPlannerState;
    onApplyRemoteState: (state: PersistedPlannerState) => void;
};

export function usePlannerSync({ state, onApplyRemoteState }: UsePlannerSyncParams) {
    const [session, setSession] = useState<SupabaseAuthSession | null>(null);
    const [authLoading, setAuthLoading] = useState(false);
    const [authError, setAuthError] = useState<string | null>(null);
    const [authMessage, setAuthMessage] = useState<string | null>(null);
    const [syncError, setSyncError] = useState<string | null>(null);
    const [pendingConflict, setPendingConflict] = useState(false);
    const [conflictCloudState, setConflictCloudState] = useState<PersistedPlannerState | null>(null);
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

    const syncEnabled = SYNC_ENABLED && hasSupabaseConfig();
    const magicLinkRedirect = getMagicLinkRedirectTarget();

    const clearAuthFeedback = useCallback(() => {
        setAuthError(null);
        setAuthMessage(null);
    }, []);

    const loadSession = useCallback(async () => {
        if (!syncEnabled) {
            setSession(null);
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
            return;
        }
        if (!isSupabaseSessionExpired(stored)) {
            setSession(stored);
            return;
        }
        const refreshed = await refreshSupabaseSession(stored);
        if (!refreshed.session || refreshed.error) {
            setSession(null);
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
        const toOnline = () => setSyncStatus("idle");
        const toOffline = () => setSyncStatus("offline");
        window.addEventListener("online", toOnline);
        window.addEventListener("offline", toOffline);
        return () => {
            window.removeEventListener("online", toOnline);
            window.removeEventListener("offline", toOffline);
        };
    }, []);

    const runInitialSync = useCallback(async (activeSession: SupabaseAuthSession): Promise<boolean> => {
        if (!syncEnabled) return false;
        if (!navigator.onLine) {
            setSyncStatus("offline");
            return false;
        }
        setSyncStatus("syncing");
        setSyncError(null);
        const localWriteTs = readStateWriteTs();
        const result = await syncPlannerState({
            session: activeSession,
            state,
            localUpdatedAt: localWriteTs > 0 ? new Date(localWriteTs).toISOString() : null
        });
        if (!result.ok) {
            setSyncStatus("error");
            setSyncError(result.error ?? "Initial sync failed.");
            return false;
        }
        if (result.action === "pulled" && result.pulledState) {
            if (result.record?.version) {
                cloudVersionRef.current = result.record.version;
            }
            skipNextPushRef.current = true;
            onApplyRemoteState(result.pulledState);
            const serialized = safeSerialize(result.pulledState);
            if (serialized.ok) {
                lastSyncedSerializedRef.current = serialized.json;
            }
            setSyncStatus("synced");
            return true;
        }
        if (result.action === "conflict" && result.record) {
            if (result.record.version) {
                cloudVersionRef.current = result.record.version;
            }
            setPendingConflict(true);
            setConflictCloudState(result.record.state);
            setSyncStatus("idle");
            return true;
        }
        if (result.record?.version) {
            cloudVersionRef.current = result.record.version;
        }
        const serialized = safeSerialize(state);
        if (serialized.ok) {
            lastSyncedSerializedRef.current = serialized.json;
        }
        setSyncStatus("synced");
        return true;
    }, [onApplyRemoteState, state, syncEnabled]);

    useEffect(() => {
        if (!syncEnabled || !session) return;
        if (initialSyncDoneForUserRef.current === session.user.id) return;
        let cancelled = false;
        void (async () => {
            const ok = await runInitialSync(session);
            if (!cancelled && ok) {
                initialSyncDoneForUserRef.current = session.user.id;
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [runInitialSync, session, syncEnabled]);

    const requestSyncNow = useCallback(async () => {
        if (!syncEnabled || !session || !navigator.onLine) {
            setSyncStatus(navigator.onLine ? "idle" : "offline");
            return false;
        }
        if (pendingConflict) {
            setSyncStatus("idle");
            return false;
        }
        setSyncStatus("syncing");
        setSyncError(null);
        const pushed = await pushPlannerStateToCloud({
            session,
            state,
            previousVersion: cloudVersionRef.current > 0 ? cloudVersionRef.current : undefined
        });
        if (pushed.error || !pushed.record) {
            if (pushed.error === CLOUD_VERSION_CONFLICT_ERROR) {
                const latest = await fetchCloudPlannerState(session);
                if (!latest.error && latest.record) {
                    setPendingConflict(true);
                    setConflictCloudState(latest.record.state);
                    setSyncStatus("idle");
                    return false;
                }
            }
            setSyncStatus("error");
            setSyncError(pushed.error ?? "Sync failed.");
            return false;
        }
        cloudVersionRef.current = pushed.record.version;
        const serialized = safeSerialize(state);
        if (serialized.ok) {
            lastSyncedSerializedRef.current = serialized.json;
        }
        setSyncStatus("synced");
        return true;
    }, [pendingConflict, session, state, syncEnabled]);

    useEffect(() => {
        if (!syncEnabled || !session || pendingConflict) return;
        if (!navigator.onLine) {
            setSyncStatus("offline");
            return;
        }
        if (skipNextPushRef.current) {
            skipNextPushRef.current = false;
            return;
        }
        const serialized = safeSerialize(state);
        if (!serialized.ok) {
            setSyncStatus("error");
            setSyncError(serialized.error.message);
            return;
        }
        if (serialized.json === lastSyncedSerializedRef.current) {
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
    }, [pendingConflict, requestSyncNow, session, state, syncEnabled]);

    const signUp = useCallback(async (email: string, password: string): Promise<boolean> => {
        clearAuthFeedback();
        setAuthLoading(true);
        const result = await signUpWithEmailPassword({ email, password });
        setAuthLoading(false);
        if (result.error) {
            setAuthError(result.error);
            return false;
        }
        setSession(result.session);
        setAuthMessage("Account created and signed in.");
        return true;
    }, [clearAuthFeedback]);

    const signIn = useCallback(async (email: string, password: string): Promise<boolean> => {
        clearAuthFeedback();
        setAuthLoading(true);
        const result = await signInWithEmailPassword({ email, password });
        setAuthLoading(false);
        if (result.error || !result.session) {
            setAuthError(result.error ?? "Login failed.");
            return false;
        }
        setSession(result.session);
        setAuthMessage("Signed in.");
        return true;
    }, [clearAuthFeedback]);

    const requestMagicLink = useCallback(async (email: string): Promise<boolean> => {
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
    }, [clearAuthFeedback, magicLinkRedirect.url]);

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
        initialSyncDoneForUserRef.current = null;
        cloudVersionRef.current = 0;
    }, [clearAuthFeedback, session]);

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
        setSyncStatus("synced");
        return true;
    }, [conflictCloudState, onApplyRemoteState, session, state]);

    const cloudEmail = session?.user.email ?? null;

    return {
        syncEnabled,
        syncStatus,
        requestSyncNow,
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
