// ─── Constants ───
export const STORAGE_KEY = "twy_planner_v2";
export const LEGACY_KEY = "twy_planner_v1";
export const HISTORY_STORAGE_KEY = "twy_planner_history";
export const HABITS_STORAGE_KEY = "twy_habits";
export const HABIT_LOG_STORAGE_KEY = "twy_habit_log";
export const DAILY_TEMPLATES_STORAGE_KEY = "daily-templates";
export const APP_DARK_MODE_STORAGE_KEY = "dark-mode";
export const APP_DATE_FORMAT_STORAGE_KEY = "twy_date_format";
export const APP_TIME_FORMAT_STORAGE_KEY = "twy_time_format";
export const CALENDAR_ID_STORAGE_KEY = "twy_calendar_id";
export const STATE_WRITE_TS_STORAGE_KEY = "twy_state_write_ts";
export const AUTO_SNAPSHOTS_STORAGE_KEY = "twy_auto_snapshots_v1";

// ─── Types ───
export type Id = string;

export type DateFormat = "eu_short" | "eu_long" | "iso";
export type TimeFormat = "24h" | "12h";
export type AppLanguage = "de" | "en";
export type SyncStatus = "idle" | "syncing" | "synced" | "error" | "offline";
export type SyncConflictResolution = "keep_local" | "keep_cloud" | "export_both";
export type StorageScope = "guest" | string;
export type BootstrapStatus = "idle" | "restoring" | "ready" | "error";
export type SyncSource = "cloud" | "local_scoped" | "guest" | "none";

export type Cycle = {
    id: Id;
    title?: string;
    startDate: string; // ISO date
    weeks: Week[];
    vision: string;
    goals: Goal[];
    weeklyTargets: Record<number, WeeklyTarget[]>; // weekIndex -> targets
    dailyPlans: Record<string, DailyBlock[]>; // date -> blocks
    dailyReviews: Record<string, DailyReview>; // date -> review
    weeklyReviews: Record<number, WeeklyReview>;
    reviewEntries?: ReviewEntry[];
    finalReview?: FinalReview;
    journalEntries?: JournalEntry[];
    journalContexts?: JournalContext[];
    defaultJournalContextId?: string;
    reminder: ReminderSettings;
    habits: Habit[];
    habitLog: Record<string, string[]>; // date -> completed habit IDs
};

export type JournalContext = {
    id: Id;
    label: string;
    color: string;
};

export type ReviewEntryType = "daily" | "weekly" | "custom" | "quick";
export type ReviewSentiment = "positive" | "negative" | "mixed" | "neutral";
export type ReviewSignal = "win" | "challenge" | "next_step" | "note";
export type ReviewEntrySource = "journal" | "today_tab" | "week_tab" | "migrated";

export type ReviewEntry = {
    id: Id;
    type: ReviewEntryType;
    date: string; // ISO date
    weekIndex?: number;
    createdAt: string; // ISO datetime
    updatedAt: string; // ISO datetime
    title?: string;
    content?: string;
    contextId?: string;
    good?: string;
    bad?: string;
    change?: string;
    signals?: ReviewSignal[];
    source: ReviewEntrySource;
};

export type JournalEntry = {
    id: Id;
    title: string;
    content: string;
    date: string; // ISO date
    createdAt: string; // ISO datetime
};

export type Habit = {
    id: Id;
    title: string;
    emoji: string;
    frequency: 'daily' | 'weekdays' | number[]; // number[] = custom weekdays (0=Sun..6=Sat)
    activeFrom: number;  // week 1-12
    activeTo: number;    // week 1-12
    startedAt: string;   // ISO date
    createdAt: string;   // ISO date
    goal?: { type: 'open' } | { type: 'target'; target: number; unit: string };
};

export type Week = {
    index: number; // 1..12
    startDate: string; // ISO
    endDate: string; // ISO
    weekName?: string;
};

export type Goal = {
    id: Id;
    title: string;
    metric?: string;
};

export type WeeklyTarget = {
    id: Id;
    title: string;
    target: number;
    unit?: string;
    manualAdjust: number;
    color?: string;
    notes?: string;
};

export type DailyBlock = {
    id: Id;
    startTime: string | null; // HH:MM or null for flexible blocks
    endTime: string | null; // HH:MM or null for flexible blocks
    isFlexible?: boolean;
    title: string;
    linkedTargetId?: Id;
    done: boolean;
    amount?: number;
    actual?: number;
    googleEventId?: string; // Google Calendar event ID for sync
};

export type DailyReview = {
    good: string;
    bad: string;
};

export type WeeklyReview = {
    good: string;
    bad: string;
    change: string;
};

export type FinalReview = {
    breakthroughs: string;
    keyLearning: string;
    lifeQuality: string;
    nextCycle: string;
};

export type ReminderSettings = {
    enabled: boolean;
    dayOffset: number; // 6 = last day of week
    time: string; // HH:MM
};

export type DailyTemplate = {
    id: Id;
    name: string;
    blocks: Array<Pick<DailyBlock, "startTime" | "endTime" | "isFlexible" | "title" | "linkedTargetId" | "amount">>;
};

export type PersistedPlannerPreferences = {
    darkMode: boolean;
    language: AppLanguage;
    dateFormat: DateFormat;
    timeFormat: TimeFormat;
    selectedCalendarId: string;
};

export type PersistedPlannerState = {
    cycle: Cycle | null;
    templates: DailyTemplate[];
    history: Cycle[];
    habits: Habit[];
    habitLog: Record<string, string[]>;
    preferences: PersistedPlannerPreferences;
};

export type LocalSnapshotMeta = {
    snapshotId: string;
    createdAt: string;
    bytes: number;
};

export type LocalSnapshotRecord = LocalSnapshotMeta & {
    payload: PersistedPlannerState;
};

// ─── Empty Defaults ───
export const emptyWeeklyReview: WeeklyReview = { good: "", bad: "", change: "" };
export const emptyDailyReview: DailyReview = { good: "", bad: "" };
export const emptyFinalReview: FinalReview = { breakthroughs: "", keyLearning: "", lifeQuality: "", nextCycle: "" };

// ─── Undo/Redo ───
export type CycleState = {
    present: Cycle | null;
    past: Cycle[];
    future: Cycle[];
};

export type CycleAction =
    | { type: 'SET'; payload: Cycle | null }
    | { type: 'UPDATE'; updateFn: (prev: Cycle) => Cycle }
    | { type: 'UNDO' }
    | { type: 'REDO' };
