import { useCallback } from "react";
import {
    checkAccountExistsByEmail,
    requestExistingAccountEmailOtp,
    signInWithEmailPassword,
    signInWithMagicLink,
    signUpWithEmailPassword,
    SupabaseAuthSession,
    verifyEmailOtpCode
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

    const checkEmailAccount = useCallback(async (email: string): Promise<"exists" | "missing" | "error"> => {
        if (!ensureSyncEnabled()) return "error";
        clearAuthFeedback();
        setAuthLoading(true);
        const result = await checkAccountExistsByEmail({ email });
        setAuthLoading(false);
        if (result.error) {
            setAuthError(result.error);
            return "error";
        }
        return result.exists ? "exists" : "missing";
    }, [clearAuthFeedback, ensureSyncEnabled, setAuthError, setAuthLoading]);

    const requestOneTimeCode = useCallback(async (email: string): Promise<boolean> => {
        if (!ensureSyncEnabled()) return false;
        clearAuthFeedback();
        setAuthLoading(true);
        const result = await requestExistingAccountEmailOtp({ email });
        setAuthLoading(false);
        if (result.error) {
            setAuthError(result.error);
            return false;
        }
        setAuthMessage("Einmalcode wurde gesendet.");
        return true;
    }, [clearAuthFeedback, ensureSyncEnabled, setAuthError, setAuthLoading, setAuthMessage]);

    const verifyOneTimeCode = useCallback(async (email: string, code: string): Promise<boolean> => {
        if (!ensureSyncEnabled()) return false;
        clearAuthFeedback();
        setAuthLoading(true);
        const result = await verifyEmailOtpCode({ email, code });
        setAuthLoading(false);
        if (result.error || !result.session) {
            setAuthError(result.error ?? "Code verification failed.");
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
        checkEmailAccount,
        requestOneTimeCode,
        verifyOneTimeCode,
        requestMagicLink
    };
}
