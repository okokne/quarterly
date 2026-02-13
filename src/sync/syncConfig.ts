declare const __VITE_SYNC_ENABLED__: string | undefined;

type SyncRuntimeEnv = {
    __TWY_ENV__?: Record<string, string | undefined>;
    __VITE_SYNC_ENABLED__?: string;
    __SYNC_ENABLED__?: string;
    process?: { env?: Record<string, string | undefined> };
};

function readSyncEnabledRawValue(): string | undefined {
    if (typeof __VITE_SYNC_ENABLED__ === "string" && __VITE_SYNC_ENABLED__.trim()) {
        return __VITE_SYNC_ENABLED__;
    }

    const runtimeEnv = globalThis as unknown as SyncRuntimeEnv;
    if (typeof runtimeEnv.__TWY_ENV__?.VITE_SYNC_ENABLED === "string") return runtimeEnv.__TWY_ENV__.VITE_SYNC_ENABLED;
    if (typeof runtimeEnv.__TWY_ENV__?.SYNC_ENABLED === "string") return runtimeEnv.__TWY_ENV__.SYNC_ENABLED;
    if (typeof runtimeEnv.__VITE_SYNC_ENABLED__ === "string") return runtimeEnv.__VITE_SYNC_ENABLED__;
    if (typeof runtimeEnv.__SYNC_ENABLED__ === "string") return runtimeEnv.__SYNC_ENABLED__;

    const processEnv = runtimeEnv.process?.env
        ?? (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process?.env;
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

export function isSyncEnabledByConfig(): boolean {
    const raw = readSyncEnabledRawValue();
    return !isExplicitlyDisabled(raw);
}
