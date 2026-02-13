import { useCallback } from "react";
import {
    signInWithEmailPassword,
    signInWithMagicLink,
    signUpWithEmailPassword,
    SupabaseAuthSession
} from "../sync/supabaseClient";

type UsePlannerSyncAuthRequestsParams = {
    syncEnabled: boolean;
    syncDisabledError: string;
    magicLinkRedirectUrl: string | null;
    clearAuthFeedback: () => void;
    markSessionSignedIn: (nextSession: SupabaseAuthSession | null, message: string) => void;
    setAuthLoading: (loading: boolean) => void;
    setAuthError: (message: string | null) => void;
    setAuthMessage: (message: string | null) => void;
};

export function usePlannerSyncAuthRequests({
    syncEnabled,
    syncDisabledError,
    magicLinkRedirectUrl,
    clearAuthFeedback,
    markSessionSignedIn,
    setAuthLoading,
    setAuthError,
    setAuthMessage
}: UsePlannerSyncAuthRequestsParams) {
    const ensureSyncEnabled = useCallback(() => {
        if (syncEnabled) return true;
        setAuthError(syncDisabledError);
        return false;
    }, [setAuthError, syncDisabledError, syncEnabled]);

    const signUp = useCallback(async (email: string, password: string): Promise<boolean> => {
        if (!ensureSyncEnabled()) return false;
        clearAuthFeedback();
        setAuthLoading(true);
        const result = await signUpWithEmailPassword({ email, password });
        setAuthLoading(false);
        if (result.error) {
            setAuthError(result.error);
            return false;
        }
        markSessionSignedIn(result.session, "Account created and signed in.");
        return true;
    }, [clearAuthFeedback, ensureSyncEnabled, markSessionSignedIn, setAuthError, setAuthLoading]);

    const signIn = useCallback(async (email: string, password: string): Promise<boolean> => {
        if (!ensureSyncEnabled()) return false;
        clearAuthFeedback();
        setAuthLoading(true);
        const result = await signInWithEmailPassword({ email, password });
        setAuthLoading(false);
        if (result.error || !result.session) {
            setAuthError(result.error ?? "Login failed.");
            return false;
        }
        markSessionSignedIn(result.session, "Signed in.");
        return true;
    }, [clearAuthFeedback, ensureSyncEnabled, markSessionSignedIn, setAuthError, setAuthLoading]);

    const requestMagicLink = useCallback(async (email: string): Promise<boolean> => {
        if (!ensureSyncEnabled()) return false;
        clearAuthFeedback();
        setAuthLoading(true);
        const result = await signInWithMagicLink({
            email,
            redirectTo: magicLinkRedirectUrl ?? undefined
        });
        setAuthLoading(false);
        if (result.error) {
            setAuthError(result.error);
            return false;
        }
        setAuthMessage("Magic-Link wurde gesendet. Bitte E-Mail pruefen.");
        return true;
    }, [clearAuthFeedback, ensureSyncEnabled, magicLinkRedirectUrl, setAuthError, setAuthLoading, setAuthMessage]);

    return {
        signUp,
        signIn,
        requestMagicLink
    };
}
