import { useEffect } from "react";
import { BootstrapStatus } from "../types";
import { loadInitialSupabaseSession } from "../sync/sessionLoader";
import { SupabaseAuthSession } from "../sync/supabaseClient";

type UsePlannerSyncInitialSessionParams = {
    syncEnabled: boolean;
    markSessionSignedIn: (session: SupabaseAuthSession | null, message: string) => void;
    setSession: (session: SupabaseAuthSession | null) => void;
    setHasPendingLocalChanges: (value: boolean) => void;
    setInitialSyncReady: (value: boolean) => void;
    setBootstrapStatus: (status: BootstrapStatus) => void;
    setAuthError: (value: string | null) => void;
};

export function usePlannerSyncInitialSession({
    syncEnabled,
    markSessionSignedIn,
    setSession,
    setHasPendingLocalChanges,
    setInitialSyncReady,
    setBootstrapStatus,
    setAuthError
}: UsePlannerSyncInitialSessionParams) {
    useEffect(() => {
        void (async () => {
            const loaded = await loadInitialSupabaseSession(syncEnabled);
            if (loaded.authError) {
                setAuthError(loaded.authError);
            }
            if (loaded.authMessage && loaded.session) {
                markSessionSignedIn(loaded.session, loaded.authMessage);
                return;
            }
            if (loaded.session) {
                setSession(loaded.session);
                return;
            }
            setSession(null);
            setHasPendingLocalChanges(false);
            setInitialSyncReady(false);
            if (!syncEnabled) {
                setBootstrapStatus("idle");
            }
        })();
    }, [
        markSessionSignedIn,
        setAuthError,
        setBootstrapStatus,
        setHasPendingLocalChanges,
        setInitialSyncReady,
        setSession,
        syncEnabled
    ]);
}
