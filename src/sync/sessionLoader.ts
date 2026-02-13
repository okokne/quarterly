import {
    consumeSupabaseSessionFromUrl,
    isSupabaseSessionExpired,
    readStoredSupabaseSession,
    refreshSupabaseSession,
    SupabaseAuthSession
} from "./supabaseClient";

export type LoadedSupabaseSession = {
    session: SupabaseAuthSession | null;
    authError: string | null;
    authMessage: string | null;
};

export async function loadInitialSupabaseSession(syncEnabled: boolean): Promise<LoadedSupabaseSession> {
    if (!syncEnabled) {
        return {
            session: null,
            authError: null,
            authMessage: null
        };
    }

    const consumed = await consumeSupabaseSessionFromUrl();
    if (consumed.session) {
        return {
            session: consumed.session,
            authError: consumed.error ?? null,
            authMessage: "Magic-Link bestaetigt. Du bist eingeloggt."
        };
    }

    const stored = readStoredSupabaseSession();
    if (!stored) {
        return {
            session: null,
            authError: consumed.error ?? null,
            authMessage: null
        };
    }

    if (!isSupabaseSessionExpired(stored)) {
        return {
            session: stored,
            authError: consumed.error ?? null,
            authMessage: null
        };
    }

    const refreshed = await refreshSupabaseSession(stored);
    if (!refreshed.session || refreshed.error) {
        return {
            session: null,
            authError: refreshed.error ?? consumed.error ?? null,
            authMessage: null
        };
    }

    return {
        session: refreshed.session,
        authError: consumed.error ?? null,
        authMessage: null
    };
}
