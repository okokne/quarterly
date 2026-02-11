import { APP_LANGUAGE_STORAGE_KEY, detectInitialLanguage, isAppLanguage } from "../i18n";
import {
    APP_DARK_MODE_STORAGE_KEY,
    APP_DATE_FORMAT_STORAGE_KEY,
    APP_TIME_FORMAT_STORAGE_KEY,
    CALENDAR_ID_STORAGE_KEY,
    DAILY_TEMPLATES_STORAGE_KEY,
    HABIT_LOG_STORAGE_KEY,
    HABITS_STORAGE_KEY,
    HISTORY_STORAGE_KEY,
    PersistedPlannerPreferences,
    PersistedPlannerState,
    STORAGE_KEY,
    Cycle,
    DailyTemplate,
    Habit
} from "../types";
import { migrateCycle } from "../utils";

export type ImportMode = "replace" | "merge_missing";

const DEFAULT_DATE_FORMAT = "eu_short";
const DEFAULT_TIME_FORMAT = "24h";

function safeJsonParse<T>(raw: string | null, fallback: T): T {
    if (!raw) return fallback;
    try {
        return JSON.parse(raw) as T;
    } catch {
        return fallback;
    }
}

function readCycle(raw: string | null): Cycle | null {
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw);
        return migrateCycle(parsed);
    } catch {
        return null;
    }
}

function readHistory(raw: string | null): Cycle[] {
    const parsed = safeJsonParse<unknown[]>(raw, []);
    if (!Array.isArray(parsed)) return [];
    return parsed
        .map((entry) => migrateCycle(entry))
        .filter((entry): entry is Cycle => entry !== null);
}

function readDateFormat(raw: string | null): PersistedPlannerPreferences["dateFormat"] {
    if (raw === "eu_short" || raw === "eu_long" || raw === "iso") return raw;
    return DEFAULT_DATE_FORMAT;
}

function readTimeFormat(raw: string | null): PersistedPlannerPreferences["timeFormat"] {
    if (raw === "24h" || raw === "12h") return raw;
    return DEFAULT_TIME_FORMAT;
}

function readLanguage(raw: string | null): PersistedPlannerPreferences["language"] {
    if (isAppLanguage(raw)) return raw;
    return detectInitialLanguage();
}

function readPreferencesFromStorage(fallback?: PersistedPlannerPreferences): PersistedPlannerPreferences {
    if (typeof localStorage === "undefined") {
        return fallback ?? {
            darkMode: false,
            language: "de",
            dateFormat: DEFAULT_DATE_FORMAT,
            timeFormat: DEFAULT_TIME_FORMAT,
            selectedCalendarId: "primary"
        };
    }

    return {
        ...(fallback ?? {
            darkMode: false,
            language: detectInitialLanguage(),
            dateFormat: DEFAULT_DATE_FORMAT,
            timeFormat: DEFAULT_TIME_FORMAT,
            selectedCalendarId: "primary"
        }),
        darkMode: localStorage.getItem(APP_DARK_MODE_STORAGE_KEY) === "true",
        language: readLanguage(localStorage.getItem(APP_LANGUAGE_STORAGE_KEY)),
        dateFormat: readDateFormat(localStorage.getItem(APP_DATE_FORMAT_STORAGE_KEY)),
        timeFormat: readTimeFormat(localStorage.getItem(APP_TIME_FORMAT_STORAGE_KEY)),
        selectedCalendarId: localStorage.getItem(CALENDAR_ID_STORAGE_KEY) || "primary"
    };
}

function normalizeHabitLog(raw: unknown): Record<string, string[]> {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
    const result: Record<string, string[]> = {};
    Object.entries(raw).forEach(([date, ids]) => {
        if (!Array.isArray(ids)) return;
        const cleanIds = ids.filter((id): id is string => typeof id === "string" && id.length > 0);
        if (cleanIds.length > 0) result[date] = Array.from(new Set(cleanIds));
    });
    return result;
}

function normalizePreferences(
    raw: unknown,
    fallback?: PersistedPlannerPreferences
): PersistedPlannerPreferences {
    const base = readPreferencesFromStorage(fallback);
    if (!raw || typeof raw !== "object") return base;
    const candidate = raw as Partial<PersistedPlannerPreferences>;

    const language = candidate.language === "de" || candidate.language === "en"
        ? candidate.language
        : base.language;
    const dateFormat = candidate.dateFormat === "eu_short" || candidate.dateFormat === "eu_long" || candidate.dateFormat === "iso"
        ? candidate.dateFormat
        : base.dateFormat;
    const timeFormat = candidate.timeFormat === "24h" || candidate.timeFormat === "12h"
        ? candidate.timeFormat
        : base.timeFormat;
    const selectedCalendarId = typeof candidate.selectedCalendarId === "string" && candidate.selectedCalendarId.trim()
        ? candidate.selectedCalendarId
        : base.selectedCalendarId;

    return {
        darkMode: typeof candidate.darkMode === "boolean" ? candidate.darkMode : base.darkMode,
        language,
        dateFormat,
        timeFormat,
        selectedCalendarId
    };
}

export function sanitizePersistedPlannerState(
    raw: unknown,
    fallbackPreferences?: PersistedPlannerPreferences
): PersistedPlannerState {
    const defaults = {
        cycle: null,
        templates: [],
        history: [],
        habits: [],
        habitLog: {},
        preferences: normalizePreferences(undefined, fallbackPreferences)
    } satisfies PersistedPlannerState;

    if (!raw || typeof raw !== "object") {
        return defaults;
    }

    const input = raw as Partial<PersistedPlannerState>;
    const cycle = migrateCycle(input.cycle);
    const templates = Array.isArray(input.templates) ? input.templates : [];
    const history = Array.isArray(input.history)
        ? input.history.map((entry) => migrateCycle(entry)).filter((entry): entry is Cycle => entry !== null)
        : [];
    const habits = Array.isArray(input.habits) ? input.habits : [];
    const habitLog = normalizeHabitLog(input.habitLog);
    const preferences = normalizePreferences(input.preferences, fallbackPreferences);

    return {
        cycle,
        templates,
        history,
        habits,
        habitLog,
        preferences
    };
}

function isSectionMissing<T>(value: T, empty: T): boolean {
    if (Array.isArray(value) && Array.isArray(empty)) return value.length === 0;
    if (value && typeof value === "object" && empty && typeof empty === "object") {
        return Object.keys(value as Record<string, unknown>).length === 0;
    }
    return value === empty;
}

export function buildPersistedPlannerState(input: PersistedPlannerState): PersistedPlannerState {
    return {
        cycle: input.cycle,
        templates: input.templates,
        history: input.history,
        habits: input.habits,
        habitLog: input.habitLog,
        preferences: input.preferences
    };
}

export function hasMeaningfulPlannerData(state: PersistedPlannerState): boolean {
    return Boolean(
        state.cycle ||
        state.templates.length > 0 ||
        state.history.length > 0 ||
        state.habits.length > 0 ||
        Object.keys(state.habitLog).length > 0
    );
}

export function readPersistedPlannerStateFromLocalStorage(
    fallbackPreferences?: PersistedPlannerPreferences
): PersistedPlannerState {
    if (typeof localStorage === "undefined") {
        return {
            cycle: null,
            templates: [],
            history: [],
            habits: [],
            habitLog: {},
            preferences: readPreferencesFromStorage(fallbackPreferences)
        };
    }

    const cycle = readCycle(localStorage.getItem(STORAGE_KEY));
    const templates = safeJsonParse<DailyTemplate[]>(localStorage.getItem(DAILY_TEMPLATES_STORAGE_KEY), []);
    const history = readHistory(localStorage.getItem(HISTORY_STORAGE_KEY));
    const habits = safeJsonParse<Habit[]>(localStorage.getItem(HABITS_STORAGE_KEY), []);
    const habitLog = normalizeHabitLog(safeJsonParse<unknown>(localStorage.getItem(HABIT_LOG_STORAGE_KEY), {}));

    return sanitizePersistedPlannerState(
        {
            cycle,
            templates: Array.isArray(templates) ? templates : [],
            history,
            habits: Array.isArray(habits) ? habits : [],
            habitLog,
            preferences: readPreferencesFromStorage(fallbackPreferences)
        },
        fallbackPreferences
    );
}

export function writePersistedPlannerStateToLocalStorage(state: PersistedPlannerState): Error | null {
    if (typeof localStorage === "undefined") return null;
    try {
        if (state.cycle) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state.cycle));
        } else {
            localStorage.removeItem(STORAGE_KEY);
        }
        localStorage.setItem(DAILY_TEMPLATES_STORAGE_KEY, JSON.stringify(state.templates));
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(state.history));
        localStorage.setItem(HABITS_STORAGE_KEY, JSON.stringify(state.habits));
        localStorage.setItem(HABIT_LOG_STORAGE_KEY, JSON.stringify(state.habitLog));
        localStorage.setItem(APP_DARK_MODE_STORAGE_KEY, String(state.preferences.darkMode));
        localStorage.setItem(APP_LANGUAGE_STORAGE_KEY, state.preferences.language);
        localStorage.setItem(APP_DATE_FORMAT_STORAGE_KEY, state.preferences.dateFormat);
        localStorage.setItem(APP_TIME_FORMAT_STORAGE_KEY, state.preferences.timeFormat);
        localStorage.setItem(CALENDAR_ID_STORAGE_KEY, state.preferences.selectedCalendarId || "primary");
        return null;
    } catch (err) {
        return err instanceof Error ? err : new Error("Unknown localStorage write error");
    }
}

export function summarizeImportSections(input: Partial<PersistedPlannerState>): string[] {
    const sections: string[] = [];
    if ("cycle" in input) sections.push("cycle");
    if ("templates" in input) sections.push("templates");
    if ("history" in input) sections.push("history");
    if ("habits" in input) sections.push("habits");
    if ("habitLog" in input) sections.push("habitLog");
    if ("preferences" in input) sections.push("preferences");
    return sections;
}

export function mergeImportedPlannerState(input: {
    current: PersistedPlannerState;
    incoming: Partial<PersistedPlannerState>;
    mode: ImportMode;
}): PersistedPlannerState {
    const { current, incoming, mode } = input;

    if (mode === "replace") {
        return {
            cycle: incoming.cycle !== undefined ? incoming.cycle : current.cycle,
            templates: incoming.templates ?? current.templates,
            history: incoming.history ?? current.history,
            habits: incoming.habits ?? current.habits,
            habitLog: incoming.habitLog ?? current.habitLog,
            preferences: incoming.preferences
                ? { ...current.preferences, ...incoming.preferences }
                : current.preferences
        };
    }

    const mergedPreferences = { ...current.preferences };
    if (incoming.preferences?.selectedCalendarId && !current.preferences.selectedCalendarId.trim()) {
        mergedPreferences.selectedCalendarId = incoming.preferences.selectedCalendarId;
    }

    return {
        cycle: isSectionMissing(current.cycle, null)
            ? (incoming.cycle !== undefined ? incoming.cycle : current.cycle)
            : current.cycle,
        templates: isSectionMissing(current.templates, []) && incoming.templates
            ? incoming.templates
            : current.templates,
        history: isSectionMissing(current.history, []) && incoming.history
            ? incoming.history
            : current.history,
        habits: isSectionMissing(current.habits, []) && incoming.habits
            ? incoming.habits
            : current.habits,
        habitLog: isSectionMissing(current.habitLog, {}) && incoming.habitLog
            ? incoming.habitLog
            : current.habitLog,
        preferences: mergedPreferences
    };
}

export function safeSerialize(value: unknown): { ok: true; json: string } | { ok: false; error: Error } {
    try {
        return { ok: true, json: JSON.stringify(value) };
    } catch (err) {
        return {
            ok: false,
            error: err instanceof Error ? err : new Error("Unknown serialization error")
        };
    }
}
