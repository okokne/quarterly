import {
    APP_DARK_MODE_STORAGE_KEY,
    APP_DATE_FORMAT_STORAGE_KEY,
    APP_TIME_FORMAT_STORAGE_KEY,
    CALENDAR_ID_STORAGE_KEY,
    DAILY_TEMPLATES_STORAGE_KEY,
    HABIT_LOG_STORAGE_KEY,
    HABITS_STORAGE_KEY,
    HISTORY_STORAGE_KEY,
    STATE_WRITE_TS_STORAGE_KEY,
    STORAGE_KEY,
    AUTO_SNAPSHOTS_STORAGE_KEY,
    StorageScope
} from "../types";
import { APP_LANGUAGE_STORAGE_KEY } from "../i18n";
import { debugSync } from "../sync/syncDebug";

const STORAGE_SCOPE_PREFIX = "twy_scope";
const ACTIVE_SCOPE_STORAGE_KEY = "twy_active_storage_scope";
const LEGACY_MIGRATION_DONE_KEY = "twy_scope_migration_done_v1";

const LEGACY_PLANNER_KEYS: string[] = [
    STORAGE_KEY,
    DAILY_TEMPLATES_STORAGE_KEY,
    HISTORY_STORAGE_KEY,
    HABITS_STORAGE_KEY,
    HABIT_LOG_STORAGE_KEY,
    APP_DARK_MODE_STORAGE_KEY,
    APP_LANGUAGE_STORAGE_KEY,
    APP_DATE_FORMAT_STORAGE_KEY,
    APP_TIME_FORMAT_STORAGE_KEY,
    CALENDAR_ID_STORAGE_KEY,
    STATE_WRITE_TS_STORAGE_KEY,
    AUTO_SNAPSHOTS_STORAGE_KEY
];

export const GUEST_SCOPE: StorageScope = "guest";

export function normalizeStorageScope(scope: StorageScope | null | undefined): StorageScope {
    if (!scope || typeof scope !== "string") return GUEST_SCOPE;
    const trimmed = scope.trim();
    if (!trimmed) return GUEST_SCOPE;
    return trimmed === GUEST_SCOPE ? GUEST_SCOPE : trimmed;
}

function encodeScope(scope: StorageScope): string {
    const normalized = normalizeStorageScope(scope);
    if (normalized === GUEST_SCOPE) return GUEST_SCOPE;
    return `user:${encodeURIComponent(normalized)}`;
}

export function getScopedStorageKey(baseKey: string, scope: StorageScope): string {
    return `${STORAGE_SCOPE_PREFIX}:${encodeScope(scope)}:${baseKey}`;
}

export function readScopedStorageValue(baseKey: string, scope: StorageScope): string | null {
    if (typeof localStorage === "undefined") return null;
    const scopedKey = getScopedStorageKey(baseKey, scope);
    const scopedValue = localStorage.getItem(scopedKey);
    if (scopedValue !== null) {
        debugSync("store_scope_read", {
            scope: normalizeStorageScope(scope),
            baseKey,
            source: "scoped",
            bytes: scopedValue.length
        });
        return scopedValue;
    }

    // Guest scope can read legacy keys for backward compatibility.
    if (normalizeStorageScope(scope) === GUEST_SCOPE) {
        const legacyValue = localStorage.getItem(baseKey);
        if (legacyValue !== null) {
            debugSync("store_scope_read", {
                scope: GUEST_SCOPE,
                baseKey,
                source: "legacy",
                bytes: legacyValue.length
            });
        }
        return legacyValue;
    }
    return null;
}

export function writeScopedStorageValue(baseKey: string, scope: StorageScope, value: string): void {
    if (typeof localStorage === "undefined") return;
    debugSync("store_scope_write", {
        scope: normalizeStorageScope(scope),
        baseKey,
        bytes: value.length
    });
    localStorage.setItem(getScopedStorageKey(baseKey, scope), value);
}

export function removeScopedStorageValue(baseKey: string, scope: StorageScope): void {
    if (typeof localStorage === "undefined") return;
    debugSync("store_scope_remove", {
        scope: normalizeStorageScope(scope),
        baseKey
    });
    localStorage.removeItem(getScopedStorageKey(baseKey, scope));
}

export function migrateLegacyPlannerKeysToGuestScope(): void {
    if (typeof localStorage === "undefined") return;
    if (localStorage.getItem(LEGACY_MIGRATION_DONE_KEY) === "1") return;

    try {
        LEGACY_PLANNER_KEYS.forEach((key) => {
            const scopedKey = getScopedStorageKey(key, GUEST_SCOPE);
            if (localStorage.getItem(scopedKey) !== null) return;
            const legacy = localStorage.getItem(key);
            if (legacy !== null) {
                localStorage.setItem(scopedKey, legacy);
            }
        });
        localStorage.setItem(LEGACY_MIGRATION_DONE_KEY, "1");
    } catch {
        // Keep app usable even if migration cannot be persisted.
    }
}

export function getActiveStorageScope(): StorageScope {
    if (typeof localStorage === "undefined") return GUEST_SCOPE;
    return normalizeStorageScope(localStorage.getItem(ACTIVE_SCOPE_STORAGE_KEY));
}

export function setActiveStorageScope(scope: StorageScope): StorageScope {
    const normalized = normalizeStorageScope(scope);
    if (typeof localStorage === "undefined") return normalized;
    try {
        localStorage.setItem(ACTIVE_SCOPE_STORAGE_KEY, normalized);
    } catch {
        // noop
    }
    return normalized;
}
