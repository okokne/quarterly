import { AppLanguage, Cycle, DailyTemplate, DateFormat, Habit, TimeFormat, Book } from "./types";
import { migrateCycle } from "./utils";

type JsonRecord = Record<string, unknown>;

export type BackupPreferences = {
    darkMode: boolean;
    language: AppLanguage;
    dateFormat: DateFormat;
    timeFormat: TimeFormat;
    selectedCalendarId: string;
};

export type BackupSnapshot = {
    schemaVersion: 2;
    exportedAt: string;
    cycle: Cycle | null;
    templates: DailyTemplate[];
    history: Cycle[];
    habits: Habit[];
    habitLog: Record<string, string[]>;
    books: Book[];
    preferences: BackupPreferences;
};

export type ParsedBackup = Partial<{
    cycle: Cycle | null;
    templates: DailyTemplate[];
    history: Cycle[];
    habits: Habit[];
    habitLog: Record<string, string[]>;
    books: Book[];
    preferences: BackupPreferences;
}>;

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^\d{2}:\d{2}$/;

function isRecord(value: unknown): value is JsonRecord {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
    return typeof value === "string";
}

function normalizeCycle(value: unknown): Cycle | null | undefined {
    if (value === null) return null;
    if (!isRecord(value)) return undefined;
    return migrateCycle(value);
}

function normalizeHistory(value: unknown): Cycle[] | undefined {
    if (!Array.isArray(value)) return undefined;
    const parsed = value
        .map((entry) => normalizeCycle(entry))
        .filter((cycle): cycle is Cycle => cycle !== undefined && cycle !== null);
    return parsed;
}

function normalizeTemplateBlock(value: unknown): DailyTemplate["blocks"][number] | null {
    if (!isRecord(value)) return null;
    if (!isString(value.title) || !value.title.trim()) return null;

    const parsedStartTime = isString(value.startTime) && TIME_REGEX.test(value.startTime)
        ? value.startTime
        : null;
    const parsedEndTime = isString(value.endTime) && TIME_REGEX.test(value.endTime)
        ? value.endTime
        : null;
    const isFlexible = value.isFlexible === true || (parsedStartTime === null && parsedEndTime === null);
    if (!isFlexible && (parsedStartTime === null || parsedEndTime === null)) return null;

    const amount = typeof value.amount === "number" && Number.isFinite(value.amount)
        ? Math.max(1, Math.floor(value.amount))
        : undefined;

    return {
        startTime: isFlexible ? null : parsedStartTime,
        endTime: isFlexible ? null : parsedEndTime,
        isFlexible: isFlexible ? true : undefined,
        title: value.title.trim(),
        linkedTargetId: isString(value.linkedTargetId) && value.linkedTargetId ? value.linkedTargetId : undefined,
        amount
    };
}

function normalizeTemplates(value: unknown): DailyTemplate[] | undefined {
    if (!Array.isArray(value)) return undefined;

    return value
        .map((entry): DailyTemplate | null => {
            if (!isRecord(entry)) return null;
            if (!isString(entry.id) || !entry.id) return null;
            if (!isString(entry.name) || !entry.name.trim()) return null;
            if (!Array.isArray(entry.blocks)) return null;

            const blocks = entry.blocks
                .map((block) => normalizeTemplateBlock(block))
                .filter((block): block is DailyTemplate["blocks"][number] => block !== null);

            return {
                id: entry.id,
                name: entry.name.trim(),
                blocks
            };
        })
        .filter((entry): entry is DailyTemplate => entry !== null);
}

function normalizeFrequency(value: unknown): Habit["frequency"] | null {
    if (value === "daily" || value === "weekdays") return value;
    if (!Array.isArray(value)) return null;

    const days = value
        .filter((day): day is number => typeof day === "number" && Number.isInteger(day) && day >= 0 && day <= 6)
        .sort((a, b) => a - b);

    return Array.from(new Set(days));
}

function normalizeHabit(value: unknown): Habit | null {
    if (!isRecord(value)) return null;
    if (!isString(value.id) || !value.id) return null;
    if (!isString(value.title) || !value.title.trim()) return null;
    const iconValue = isString(value.emoji) ? value.emoji.trim() : "";
    if (!isString(value.startedAt) || !ISO_DATE_REGEX.test(value.startedAt)) return null;
    if (!isString(value.createdAt) || !ISO_DATE_REGEX.test(value.createdAt)) return null;

    const frequency = normalizeFrequency(value.frequency);
    if (!frequency) return null;

    const activeFrom = typeof value.activeFrom === "number" ? value.activeFrom : 1;
    const activeTo = typeof value.activeTo === "number" ? value.activeTo : 12;

    let goal: Habit["goal"] | undefined;
    if (isRecord(value.goal) && value.goal.type === "target") {
        const target = typeof value.goal.target === "number" && Number.isFinite(value.goal.target)
            ? Math.max(1, Math.floor(value.goal.target))
            : 1;
        const unit = isString(value.goal.unit) ? value.goal.unit : "";
        goal = { type: "target", target, unit };
    } else if (isRecord(value.goal) && value.goal.type === "open") {
        goal = { type: "open" };
    }

    return {
        id: value.id,
        title: value.title.trim(),
        emoji: iconValue || "sparkles",
        frequency,
        activeFrom: Math.max(1, Math.floor(activeFrom)),
        activeTo: Math.max(1, Math.floor(activeTo)),
        startedAt: value.startedAt,
        createdAt: value.createdAt,
        goal
    };
}

function normalizeHabits(value: unknown): Habit[] | undefined {
    if (!Array.isArray(value)) return undefined;
    return value
        .map((entry) => normalizeHabit(entry))
        .filter((entry): entry is Habit => entry !== null);
}

function normalizeHabitLog(value: unknown): Record<string, string[]> | undefined {
    if (!isRecord(value)) return undefined;

    const result: Record<string, string[]> = {};
    Object.entries(value).forEach(([date, rawIds]) => {
        if (!ISO_DATE_REGEX.test(date) || !Array.isArray(rawIds)) return;
        const ids = rawIds
            .filter((id): id is string => isString(id) && id.length > 0);
        const unique = Array.from(new Set(ids));
        if (unique.length > 0) {
            result[date] = unique;
        }
    });
    return result;
}

function normalizeBooks(value: unknown): Book[] | undefined {
    if (!Array.isArray(value)) return undefined;
    // Minimal validation to pass TS
    return value as Book[];
}

function normalizePreferences(value: unknown): BackupPreferences | undefined {
    if (!isRecord(value)) return undefined;
    if (typeof value.darkMode !== "boolean") return undefined;
    if (value.language !== "de" && value.language !== "en") return undefined;
    if (value.dateFormat !== "eu_short" && value.dateFormat !== "eu_long" && value.dateFormat !== "iso") return undefined;
    if (value.timeFormat !== "24h" && value.timeFormat !== "12h") return undefined;
    if (!isString(value.selectedCalendarId)) return undefined;

    return {
        darkMode: value.darkMode,
        language: value.language,
        dateFormat: value.dateFormat,
        timeFormat: value.timeFormat,
        selectedCalendarId: value.selectedCalendarId
    };
}

export function createBackupSnapshot(input: Omit<BackupSnapshot, "schemaVersion" | "exportedAt">): BackupSnapshot {
    return {
        schemaVersion: 2,
        exportedAt: new Date().toISOString(),
        ...input
    };
}

export function parseBackupPayload(raw: unknown): ParsedBackup {
    if (!isRecord(raw)) {
        throw new Error("Backup payload is not an object.");
    }

    const hasKnownKey = ["cycle", "templates", "history", "habits", "habitLog", "books", "preferences"]
        .some((key) => key in raw);
    if (!hasKnownKey) {
        throw new Error("Backup payload has no known keys.");
    }

    const parsed: ParsedBackup = {};

    if ("cycle" in raw) {
        const cycle = normalizeCycle(raw.cycle);
        if (cycle === undefined) throw new Error("Invalid cycle in backup.");
        parsed.cycle = cycle;
    }
    if ("templates" in raw) {
        const templates = normalizeTemplates(raw.templates);
        if (templates === undefined) throw new Error("Invalid templates in backup.");
        parsed.templates = templates;
    }
    if ("history" in raw) {
        const history = normalizeHistory(raw.history);
        if (history === undefined) throw new Error("Invalid history in backup.");
        parsed.history = history;
    }
    if ("habits" in raw) {
        const habits = normalizeHabits(raw.habits);
        if (habits === undefined) throw new Error("Invalid habits in backup.");
        parsed.habits = habits;
    }
    if ("habitLog" in raw) {
        const habitLog = normalizeHabitLog(raw.habitLog);
        if (habitLog === undefined) throw new Error("Invalid habit log in backup.");
        parsed.habitLog = habitLog;
    }
    if ("books" in raw) {
        const books = normalizeBooks(raw.books);
        if (books === undefined) throw new Error("Invalid books in backup.");
        parsed.books = books;
    }
    if ("preferences" in raw) {
        const preferences = normalizePreferences(raw.preferences);
        if (!preferences) throw new Error("Invalid preferences in backup.");
        parsed.preferences = preferences;
    }

    return parsed;
}
