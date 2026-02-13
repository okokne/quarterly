export type SupabaseConfig = {
    url: string;
    anonKey: string;
};

export type SupabaseAuthUser = {
    id: string;
    email?: string;
};

export type SupabaseAuthSession = {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    expires_at?: number;
    token_type: string;
    user: SupabaseAuthUser;
};

declare const __VITE_SUPABASE_URL__: string | undefined;
declare const __VITE_SUPABASE_ANON_KEY__: string | undefined;
declare const __VITE_SUPABASE_PUBLISHABLE_KEY__: string | undefined;
declare const __VITE_AUTH_REDIRECT_URL__: string | undefined;
declare const __VITE_SYNC_ENABLED__: string | undefined;

function readViteEnv(name: string): string | undefined {
    if (name === "VITE_SUPABASE_URL" && typeof __VITE_SUPABASE_URL__ === "string" && __VITE_SUPABASE_URL__.trim()) {
        return __VITE_SUPABASE_URL__;
    }
    if (name === "VITE_SUPABASE_ANON_KEY" && typeof __VITE_SUPABASE_ANON_KEY__ === "string" && __VITE_SUPABASE_ANON_KEY__.trim()) {
        return __VITE_SUPABASE_ANON_KEY__;
    }
    if (name === "VITE_SUPABASE_PUBLISHABLE_KEY" && typeof __VITE_SUPABASE_PUBLISHABLE_KEY__ === "string" && __VITE_SUPABASE_PUBLISHABLE_KEY__.trim()) {
        return __VITE_SUPABASE_PUBLISHABLE_KEY__;
    }
    if (name === "VITE_AUTH_REDIRECT_URL" && typeof __VITE_AUTH_REDIRECT_URL__ === "string" && __VITE_AUTH_REDIRECT_URL__.trim()) {
        return __VITE_AUTH_REDIRECT_URL__;
    }
    if (name === "VITE_SYNC_ENABLED" && typeof __VITE_SYNC_ENABLED__ === "string" && __VITE_SYNC_ENABLED__.trim()) {
        return __VITE_SYNC_ENABLED__;
    }

    const runtimeEnv = (globalThis as unknown as {
        __TWY_ENV__?: Record<string, string | undefined>;
        process?: { env?: Record<string, string | undefined> };
        __VITE_SUPABASE_URL__?: string;
        __VITE_SUPABASE_ANON_KEY__?: string;
        __VITE_SUPABASE_PUBLISHABLE_KEY__?: string;
        __VITE_AUTH_REDIRECT_URL__?: string;
        __SUPABASE_URL__?: string;
        __SUPABASE_ANON_KEY__?: string;
        __SUPABASE_PUBLISHABLE_KEY__?: string;
        __AUTH_REDIRECT_URL__?: string;
    }).__TWY_ENV__;
    if (runtimeEnv?.[name]) return runtimeEnv[name];

    const constants = globalThis as unknown as {
        __VITE_SUPABASE_URL__?: string;
        __VITE_SUPABASE_ANON_KEY__?: string;
        __VITE_SUPABASE_PUBLISHABLE_KEY__?: string;
        __VITE_AUTH_REDIRECT_URL__?: string;
        __SUPABASE_URL__?: string;
        __SUPABASE_ANON_KEY__?: string;
        __SUPABASE_PUBLISHABLE_KEY__?: string;
        __AUTH_REDIRECT_URL__?: string;
    };
    if (name === "VITE_SUPABASE_URL" && constants.__VITE_SUPABASE_URL__) {
        return constants.__VITE_SUPABASE_URL__;
    }
    if (name === "SUPABASE_URL" && constants.__SUPABASE_URL__) {
        return constants.__SUPABASE_URL__;
    }
    if (name === "VITE_SUPABASE_ANON_KEY" && constants.__VITE_SUPABASE_ANON_KEY__) {
        return constants.__VITE_SUPABASE_ANON_KEY__;
    }
    if (name === "VITE_SUPABASE_PUBLISHABLE_KEY" && constants.__VITE_SUPABASE_PUBLISHABLE_KEY__) {
        return constants.__VITE_SUPABASE_PUBLISHABLE_KEY__;
    }
    if (name === "SUPABASE_ANON_KEY" && constants.__SUPABASE_ANON_KEY__) {
        return constants.__SUPABASE_ANON_KEY__;
    }
    if (name === "SUPABASE_PUBLISHABLE_KEY" && constants.__SUPABASE_PUBLISHABLE_KEY__) {
        return constants.__SUPABASE_PUBLISHABLE_KEY__;
    }
    if (name === "VITE_AUTH_REDIRECT_URL" && constants.__VITE_AUTH_REDIRECT_URL__) {
        return constants.__VITE_AUTH_REDIRECT_URL__;
    }
    if (name === "AUTH_REDIRECT_URL" && constants.__AUTH_REDIRECT_URL__) {
        return constants.__AUTH_REDIRECT_URL__;
    }

    const processEnv = (globalThis as unknown as {
        process?: { env?: Record<string, string | undefined> };
    }).process?.env;
    return processEnv?.[name];
}

function firstDefinedEnv(names: string[]): string | undefined {
    for (const name of names) {
        const value = readViteEnv(name);
        if (typeof value === "string" && value.trim()) {
            return value.trim();
        }
    }
    return undefined;
}

const SUPABASE_SESSION_STORAGE_KEY = "twy_supabase_session";

type SupabaseFetchResult<T> = {
    data: T | null;
    error: string | null;
    status: number;
};

type JwtPayload = {
    sub?: string;
    email?: string;
};

function normalizeBaseUrl(url: string): string {
    return url.replace(/\/+$/, "");
}

function normalizeRedirectUrl(url: string): string | null {
    const trimmed = url.trim();
    if (!trimmed) return null;
    try {
        const parsed = new URL(trimmed);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
        parsed.hash = "";
        return `${parsed.origin}${parsed.pathname}${parsed.search}`;
    } catch {
        if (typeof window === "undefined") return null;
        if (!trimmed.startsWith("/")) return null;
        const parsed = new URL(trimmed, window.location.origin);
        parsed.hash = "";
        return `${parsed.origin}${parsed.pathname}${parsed.search}`;
    }
}

export function getMagicLinkRedirectTarget(override?: string): {
    url: string | null;
    error: string | null;
} {
    const manual = override?.trim();
    if (manual) {
        const normalizedManual = normalizeRedirectUrl(manual);
        if (!normalizedManual) {
            return { url: null, error: "Ungültige Magic-Link Redirect-URL (override)." };
        }
        return { url: normalizedManual, error: null };
    }

    const configured = firstDefinedEnv([
        "VITE_AUTH_REDIRECT_URL",
        "AUTH_REDIRECT_URL",
        "NEXT_PUBLIC_AUTH_REDIRECT_URL"
    ]);
    if (configured) {
        const normalizedConfigured = normalizeRedirectUrl(configured);
        if (!normalizedConfigured) {
            return { url: null, error: "Ungültige VITE_AUTH_REDIRECT_URL." };
        }
        return { url: normalizedConfigured, error: null };
    }

    if (typeof window === "undefined") return { url: null, error: null };
    const current = normalizeRedirectUrl(`${window.location.origin}${window.location.pathname}${window.location.search}`);
    return { url: current, error: null };
}

export function getSupabaseConfigFromEnv(): SupabaseConfig | null {
    const url = firstDefinedEnv([
        "VITE_SUPABASE_URL",
        "SUPABASE_URL",
        "NEXT_PUBLIC_SUPABASE_URL"
    ]);
    const anonKey = firstDefinedEnv([
        "VITE_SUPABASE_ANON_KEY",
        "VITE_SUPABASE_PUBLISHABLE_KEY",
        "SUPABASE_ANON_KEY",
        "SUPABASE_PUBLISHABLE_KEY",
        "NEXT_PUBLIC_SUPABASE_ANON_KEY",
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
    ]);
    if (!url || !anonKey) return null;
    return { url: normalizeBaseUrl(url), anonKey };
}

function enrichSession(session: SupabaseAuthSession): SupabaseAuthSession {
    const expiresAt = session.expires_at
        ?? Math.floor(Date.now() / 1000) + Math.max(0, session.expires_in);
    return {
        ...session,
        expires_at: expiresAt
    };
}

export function hasSupabaseConfig(): boolean {
    return getSupabaseConfigFromEnv() !== null;
}

function parseSession(raw: string | null): SupabaseAuthSession | null {
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw) as SupabaseAuthSession;
        if (!parsed?.access_token || !parsed?.refresh_token || !parsed?.user?.id) return null;
        return enrichSession(parsed);
    } catch {
        return null;
    }
}

export function readStoredSupabaseSession(): SupabaseAuthSession | null {
    if (typeof localStorage === "undefined") return null;
    return parseSession(localStorage.getItem(SUPABASE_SESSION_STORAGE_KEY));
}

export function writeStoredSupabaseSession(session: SupabaseAuthSession | null): void {
    if (typeof localStorage === "undefined") return;
    if (!session) {
        localStorage.removeItem(SUPABASE_SESSION_STORAGE_KEY);
        return;
    }
    localStorage.setItem(SUPABASE_SESSION_STORAGE_KEY, JSON.stringify(enrichSession(session)));
}

export function clearStoredSupabaseSession(): void {
    writeStoredSupabaseSession(null);
}

export function isSupabaseSessionExpired(session: SupabaseAuthSession, skewSeconds: number = 30): boolean {
    const expiresAt = session.expires_at
        ?? Math.floor(Date.now() / 1000) + Math.max(0, session.expires_in);
    const now = Math.floor(Date.now() / 1000);
    return expiresAt <= now + Math.max(0, skewSeconds);
}

function decodeBase64Url(value: string): string | null {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    try {
        if (typeof atob === "function") {
            return atob(padded);
        }
    } catch {
        // noop
    }
    try {
        const maybeBuffer = (globalThis as unknown as {
            Buffer?: {
                from: (input: string, encoding: string) => { toString: (encoding: string) => string };
            };
        }).Buffer;
        if (maybeBuffer) {
            return maybeBuffer.from(padded, "base64").toString("utf-8");
        }
    } catch {
        // noop
    }
    return null;
}

function decodeJwtPayload(token: string): JwtPayload | null {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const decoded = decodeBase64Url(parts[1]);
    if (!decoded) return null;
    try {
        return JSON.parse(decoded) as JwtPayload;
    } catch {
        return null;
    }
}

async function supabaseFetchJson<T>(
    path: string,
    init: RequestInit,
    accessToken?: string
): Promise<SupabaseFetchResult<T>> {
    const config = getSupabaseConfigFromEnv();
    if (!config) {
        return {
            data: null,
            error: "Supabase is not configured. Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.",
            status: 0
        };
    }

    const headers: Record<string, string> = {
        apikey: config.anonKey,
        "Content-Type": "application/json",
        ...(init.headers as Record<string, string> | undefined)
    };
    if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
    }

    try {
        const response = await fetch(`${config.url}${path}`, {
            ...init,
            headers
        });
        const text = await response.text();
        const parsed = text ? JSON.parse(text) as unknown : null;
        if (!response.ok) {
            const payload = (parsed && typeof parsed === "object") ? parsed as Record<string, unknown> : {};
            const message = typeof payload.msg === "string"
                ? payload.msg
                : typeof payload.error_description === "string"
                    ? payload.error_description
                    : typeof payload.message === "string"
                        ? payload.message
                        : `Request failed (${response.status})`;
            return {
                data: null,
                error: message,
                status: response.status
            };
        }

        return {
            data: parsed as T,
            error: null,
            status: response.status
        };
    } catch (err) {
        return {
            data: null,
            error: err instanceof Error ? err.message : "Network error",
            status: 0
        };
    }
}

type AuthTokenResponse = {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    expires_at?: number;
    token_type: string;
    user: SupabaseAuthUser;
};

function toSession(payload: AuthTokenResponse): SupabaseAuthSession {
    return enrichSession({
        access_token: payload.access_token,
        refresh_token: payload.refresh_token,
        expires_in: payload.expires_in,
        expires_at: payload.expires_at,
        token_type: payload.token_type,
        user: payload.user
    });
}

export async function signUpWithEmailPassword(input: {
    email: string;
    password: string;
}): Promise<{ session: SupabaseAuthSession | null; error: string | null }> {
    const result = await supabaseFetchJson<{
        access_token?: string;
        refresh_token?: string;
        expires_in?: number;
        expires_at?: number;
        token_type?: string;
        user?: SupabaseAuthUser;
    }>("/auth/v1/signup", {
        method: "POST",
        body: JSON.stringify({
            email: input.email.trim(),
            password: input.password
        })
    });
    if (!result.data || result.error) {
        return { session: null, error: result.error ?? "Sign-up failed" };
    }

    if (
        !result.data.access_token ||
        !result.data.refresh_token ||
        !result.data.expires_in ||
        !result.data.token_type ||
        !result.data.user
    ) {
        return {
            session: null,
            error: "Konto erstellt. Bitte E-Mail bestätigen und dann einloggen."
        };
    }

    const session = toSession({
        access_token: result.data.access_token,
        refresh_token: result.data.refresh_token,
        expires_in: result.data.expires_in,
        expires_at: result.data.expires_at,
        token_type: result.data.token_type,
        user: result.data.user
    });
    writeStoredSupabaseSession(session);
    return { session, error: null };
}

export async function signInWithEmailPassword(input: {
    email: string;
    password: string;
}): Promise<{ session: SupabaseAuthSession | null; error: string | null }> {
    const result = await supabaseFetchJson<AuthTokenResponse>("/auth/v1/token?grant_type=password", {
        method: "POST",
        body: JSON.stringify({
            email: input.email.trim(),
            password: input.password
        })
    });
    if (!result.data || result.error) {
        return { session: null, error: result.error ?? "Login failed" };
    }
    const session = toSession(result.data);
    writeStoredSupabaseSession(session);
    return { session, error: null };
}

export async function signInWithMagicLink(input: {
    email: string;
    redirectTo?: string;
}): Promise<{ ok: boolean; error: string | null }> {
    const redirectTarget = getMagicLinkRedirectTarget(input.redirectTo);
    if (redirectTarget.error) {
        return { ok: false, error: redirectTarget.error };
    }

    const redirectTo = redirectTarget.url;
    const payload: Record<string, unknown> = {
        email: input.email.trim(),
        create_user: true
    };
    if (redirectTo) {
        payload.email_redirect_to = redirectTo;
        payload.options = { emailRedirectTo: redirectTo };
    }

    const result = await supabaseFetchJson<Record<string, unknown>>("/auth/v1/otp", {
        method: "POST",
        body: JSON.stringify(payload)
    });
    return {
        ok: !result.error,
        error: result.error
    };
}

export async function requestExistingAccountEmailOtp(input: {
    email: string;
}): Promise<{ ok: boolean; error: string | null }> {
    const result = await supabaseFetchJson<Record<string, unknown>>("/auth/v1/otp", {
        method: "POST",
        body: JSON.stringify({
            email: input.email.trim(),
            create_user: false
        })
    });
    return {
        ok: !result.error,
        error: result.error
    };
}

export async function checkAccountExistsByEmail(input: {
    email: string;
}): Promise<{ exists: boolean; error: string | null }> {
    const otp = await requestExistingAccountEmailOtp({ email: input.email });
    if (otp.ok) {
        return { exists: true, error: null };
    }

    const message = (otp.error ?? "").toLowerCase();
    if (
        message.includes("not found")
        || message.includes("no user")
        || message.includes("user does not exist")
        || message.includes("invalid email")
        || message.includes("signups not allowed for otp")
        || message.includes("otp signups are disabled")
    ) {
        return { exists: false, error: null };
    }

    return { exists: false, error: otp.error ?? "Account lookup failed." };
}

export async function verifyEmailOtpCode(input: {
    email: string;
    code: string;
}): Promise<{ session: SupabaseAuthSession | null; error: string | null }> {
    const result = await supabaseFetchJson<Record<string, unknown>>("/auth/v1/verify", {
        method: "POST",
        body: JSON.stringify({
            email: input.email.trim(),
            token: input.code.trim(),
            type: "email"
        })
    });

    if (!result.data || result.error) {
        return { session: null, error: result.error ?? "Code verification failed." };
    }

    const payload = (
        ("access_token" in result.data ? result.data : null)
        ?? (typeof result.data.session === "object" && result.data.session ? result.data.session as Record<string, unknown> : null)
    );
    if (!payload) {
        return { session: null, error: "Code verification failed." };
    }

    const accessToken = typeof payload.access_token === "string" ? payload.access_token : null;
    const refreshToken = typeof payload.refresh_token === "string" ? payload.refresh_token : null;
    const expiresIn = typeof payload.expires_in === "number" ? payload.expires_in : null;
    const tokenType = typeof payload.token_type === "string" ? payload.token_type : null;
    const user = (typeof payload.user === "object" && payload.user) ? payload.user as SupabaseAuthUser : null;
    const expiresAt = typeof payload.expires_at === "number" ? payload.expires_at : undefined;

    if (!accessToken || !refreshToken || !expiresIn || !tokenType || !user?.id) {
        return { session: null, error: "Code verification failed." };
    }

    const session = toSession({
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: expiresIn,
        expires_at: expiresAt,
        token_type: tokenType,
        user
    });
    writeStoredSupabaseSession(session);
    return { session, error: null };
}

function clearAuthCallbackParamsFromUrl(): void {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const authParams = [
        "access_token",
        "refresh_token",
        "expires_in",
        "expires_at",
        "token_type",
        "type",
        "error",
        "error_code",
        "error_description"
    ];
    authParams.forEach((key) => url.searchParams.delete(key));
    url.hash = "";
    const next = `${url.pathname}${url.search}`;
    window.history.replaceState(window.history.state, document.title, next);
}

function authParamsFromLocation(): URLSearchParams | null {
    if (typeof window === "undefined") return null;
    const rawHash = window.location.hash.startsWith("#")
        ? window.location.hash.slice(1)
        : window.location.hash;
    if (rawHash.includes("access_token=") || rawHash.includes("error=")) {
        return new URLSearchParams(rawHash);
    }
    const rawSearch = window.location.search.startsWith("?")
        ? window.location.search.slice(1)
        : window.location.search;
    if (rawSearch.includes("access_token=") || rawSearch.includes("error=")) {
        return new URLSearchParams(rawSearch);
    }
    return null;
}

export async function consumeSupabaseSessionFromUrl(): Promise<{
    session: SupabaseAuthSession | null;
    error: string | null;
}> {
    const params = authParamsFromLocation();
    if (!params) {
        return { session: null, error: null };
    }

    const callbackError = params.get("error_description") || params.get("error");
    if (callbackError) {
        clearAuthCallbackParamsFromUrl();
        return { session: null, error: callbackError };
    }

    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const expiresInRaw = params.get("expires_in");
    const tokenType = params.get("token_type") || "bearer";
    const expiresAtRaw = params.get("expires_at");

    if (!accessToken || !refreshToken || !expiresInRaw) {
        clearAuthCallbackParamsFromUrl();
        return { session: null, error: "Ungültiger Login-Link." };
    }

    const expiresIn = Number.parseInt(expiresInRaw, 10);
    if (!Number.isFinite(expiresIn) || expiresIn <= 0) {
        clearAuthCallbackParamsFromUrl();
        return { session: null, error: "Ungültiger Login-Link." };
    }

    const jwtPayload = decodeJwtPayload(accessToken);
    const userId = jwtPayload?.sub;
    if (!userId) {
        clearAuthCallbackParamsFromUrl();
        return { session: null, error: "Konnte Benutzer aus Login-Link nicht lesen." };
    }

    const expiresAt = expiresAtRaw ? Number.parseInt(expiresAtRaw, 10) : undefined;
    const session = enrichSession({
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: expiresIn,
        expires_at: Number.isFinite(expiresAt ?? NaN) ? expiresAt : undefined,
        token_type: tokenType,
        user: {
            id: userId,
            email: jwtPayload?.email
        }
    });
    writeStoredSupabaseSession(session);
    clearAuthCallbackParamsFromUrl();
    return { session, error: null };
}

export async function refreshSupabaseSession(
    session: SupabaseAuthSession
): Promise<{ session: SupabaseAuthSession | null; error: string | null }> {
    const result = await supabaseFetchJson<AuthTokenResponse>("/auth/v1/token?grant_type=refresh_token", {
        method: "POST",
        body: JSON.stringify({
            refresh_token: session.refresh_token
        })
    });
    if (!result.data || result.error) {
        clearStoredSupabaseSession();
        return { session: null, error: result.error ?? "Session refresh failed" };
    }
    const refreshed = toSession(result.data);
    writeStoredSupabaseSession(refreshed);
    return { session: refreshed, error: null };
}

export async function signOutSupabase(
    session: SupabaseAuthSession | null
): Promise<{ ok: boolean; error: string | null }> {
    if (!session) {
        clearStoredSupabaseSession();
        return { ok: true, error: null };
    }
    const result = await supabaseFetchJson<Record<string, never>>("/auth/v1/logout", {
        method: "POST"
    }, session.access_token);
    clearStoredSupabaseSession();
    return {
        ok: !result.error,
        error: result.error
    };
}

export async function deleteSupabaseUser(
    session: SupabaseAuthSession
): Promise<{ ok: boolean; error: string | null }> {
    const result = await supabaseFetchJson<Record<string, unknown>>("/auth/v1/user", {
        method: "DELETE"
    }, session.access_token);
    if (!result.error) {
        return { ok: true, error: null };
    }

    const normalized = result.error.toLowerCase();
    if (
        normalized.includes("not found")
        || normalized.includes("method not allowed")
        || normalized.includes("not supported")
    ) {
        return {
            ok: false,
            error: "Account-Löschen ist für diesen Supabase-Auth-Provider nicht direkt verfügbar."
        };
    }

    return {
        ok: false,
        error: result.error
    };
}

export async function updateSupabasePassword(input: {
    session: SupabaseAuthSession;
    password: string;
}): Promise<{ ok: boolean; error: string | null }> {
    const result = await supabaseFetchJson<Record<string, unknown>>("/auth/v1/user", {
        method: "PUT",
        body: JSON.stringify({
            password: input.password
        })
    }, input.session.access_token);

    return {
        ok: !result.error,
        error: result.error
    };
}

export async function supabaseRestRequest<T>(
    path: string,
    init: RequestInit,
    session: SupabaseAuthSession
): Promise<SupabaseFetchResult<T>> {
    return supabaseFetchJson<T>(path, init, session.access_token);
}
