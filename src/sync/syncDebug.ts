declare const __VITE_SYNC_DEBUG__: string | undefined;

function parseBooleanLike(value: string | undefined): boolean {
    if (!value) return false;
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "1" || normalized === "yes" || normalized === "on";
}

function readDebugRawValue(): string | undefined {
    if (typeof __VITE_SYNC_DEBUG__ === "string" && __VITE_SYNC_DEBUG__.trim()) {
        return __VITE_SYNC_DEBUG__;
    }
    const runtimeEnv = (globalThis as unknown as {
        __TWY_ENV__?: Record<string, string | undefined>;
        __VITE_SYNC_DEBUG__?: string;
        process?: { env?: Record<string, string | undefined> };
    });
    if (typeof runtimeEnv.__TWY_ENV__?.VITE_SYNC_DEBUG === "string") return runtimeEnv.__TWY_ENV__.VITE_SYNC_DEBUG;
    if (typeof runtimeEnv.__VITE_SYNC_DEBUG__ === "string") return runtimeEnv.__VITE_SYNC_DEBUG__;
    const processEnv = runtimeEnv.process?.env ?? (globalThis as unknown as {
        process?: { env?: Record<string, string | undefined> };
    }).process?.env;
    return processEnv?.VITE_SYNC_DEBUG ?? processEnv?.SYNC_DEBUG;
}

export const SYNC_DEBUG_ENABLED = parseBooleanLike(readDebugRawValue());

export function debugSync(event: string, payload?: Record<string, unknown>): void {
    if (!SYNC_DEBUG_ENABLED) return;
    if (payload) {
        console.info(`[sync] ${event}`, payload);
        return;
    }
    console.info(`[sync] ${event}`);
}
