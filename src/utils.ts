import {
    AppLanguage,
    Cycle,
    CycleState,
    CycleAction,
    Week,
    Goal,
    DailyBlock,
    DailyReview,
    WeeklyReview,
    ReviewEntry,
    ReviewEntrySource,
    ReviewSignal,
    ReviewSentiment,
    Habit,
    STORAGE_KEY,
    DateFormat,
    TimeFormat
} from "./types";
import type { Id } from "./types";
import { getActiveStorageScope, readScopedStorageValue, writeScopedStorageValue } from "./persistence/storageScope";

// ─── ID Generator ───
export function uid(): Id {
    return Math.random().toString(36).slice(2, 10);
}

// ─── Date Utilities ───
export function toIsoDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

export function parseIso(dateStr: string): Date {
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(y, m - 1, d);
}

export function addDays(dateStr: string, days: number): string {
    const date = parseIso(dateStr);
    date.setDate(date.getDate() + days);
    return toIsoDate(date);
}

export function formatDate(dateStr: string, fmt: DateFormat, language: AppLanguage = "de"): string {
    const months = language === "de"
        ? ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"]
        : ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const date = parseIso(dateStr);
    const day = String(date.getDate()).padStart(2, "0");
    const monthIndex = date.getMonth();
    const monthNum = String(monthIndex + 1).padStart(2, "0");
    const year = String(date.getFullYear());

    if (fmt === "eu_short") return `${day}.${monthNum}.${year}`;
    if (fmt === "eu_long") return `${day}. ${months[monthIndex]} ${year}`;
    return `${year}-${monthNum}-${day}`;
}

export function formatTime(timeStr: string, fmt: TimeFormat): string {
    if (fmt === "24h") return timeStr;
    const [hStr, mStr] = timeStr.split(":");
    const hours = Number(hStr);
    const minutes = mStr ?? "00";
    const suffix = hours >= 12 ? "PM" : "AM";
    const hour12 = hours % 12 === 0 ? 12 : hours % 12;
    return `${hour12}:${minutes} ${suffix}`;
}

export function formatDateEuropean(dateStr: string): string {
    return formatDate(dateStr, "eu_long");
}

export function formatRange(start: string, end: string, fmt: DateFormat = "eu_short", language: AppLanguage = "de"): string {
    const separator = language === "de" ? "bis" : "to";
    return `${formatDate(start, fmt, language)} ${separator} ${formatDate(end, fmt, language)}`;
}

export function weekdayLabel(dateStr: string, language: AppLanguage = "de"): string {
    const day = parseIso(dateStr).getDay(); // 0=So
    const labels = language === "de"
        ? ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"]
        : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return labels[day];
}

export function getWeekIndexForDate(cycle: Cycle, dateStr: string): number {
    const date = parseIso(dateStr);
    const start = parseIso(cycle.weeks[0].startDate);
    const diffDays = Math.floor((date.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
    const rawIndex = Math.floor(diffDays / 7) + 1;
    if (rawIndex < 1) return 1;
    if (rawIndex > 12) return 12;
    return rawIndex;
}

export function getDatesInWeek(week: Week): string[] {
    return Array.from({ length: 7 }, (_, i) => addDays(week.startDate, i));
}

export function clamp(n: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, n));
}

// ─── Persistence ───
export function loadCycle(): Cycle | null {
    const raw = readScopedStorageValue(STORAGE_KEY, getActiveStorageScope());
    if (!raw) return null;
    try {
        return JSON.parse(raw) as Cycle;
    } catch {
        return null;
    }
}

export function saveCycle(cycle: Cycle | null): void {
    if (!cycle) return;
    try {
        writeScopedStorageValue(STORAGE_KEY, getActiveStorageScope(), JSON.stringify(cycle));
    } catch (err) {
        console.error("Failed to persist cycle:", err);
    }
}

// ─── Cycle Builders ───
export function buildCycle(title: string, startDateInput: string): Cycle {
    const startDate = startDateInput;
    const weeks: Week[] = Array.from({ length: 12 }, (_, i) => {
        const weekStart = addDays(startDate, i * 7);
        return {
            index: i + 1,
            startDate: weekStart,
            endDate: addDays(weekStart, 6)
        };
    });

    return {
        id: uid(),
        title: title.trim() || undefined,
        startDate: startDateInput,
        weeks,
        vision: "",
        goals: [],
        weeklyTargets: {},
        dailyPlans: {},
        dailyReviews: {},
        weeklyReviews: {},
        reviewEntries: [],
        finalReview: undefined,
        journalEntries: [],
        reminder: { enabled: true, dayOffset: 6, time: "08:00" },
        habits: [],
        habitLog: {}
    };
}

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function isValidReviewType(value: unknown): value is ReviewEntry["type"] {
    return value === "daily" || value === "weekly" || value === "custom";
}

function isValidReviewSource(value: unknown): value is ReviewEntrySource {
    return value === "journal" || value === "today_tab" || value === "week_tab" || value === "migrated";
}

function isValidReviewSignal(value: unknown): value is ReviewSignal {
    return value === "win" || value === "challenge" || value === "next_step" || value === "note";
}

function normalizeReviewSignals(value: unknown): ReviewSignal[] | undefined {
    if (!Array.isArray(value)) return undefined;
    const unique = new Set<ReviewSignal>();
    value.forEach((item) => {
        if (isValidReviewSignal(item)) unique.add(item);
    });
    if (unique.size === 0) return undefined;
    return Array.from(unique);
}

function trimToUndefined(value: unknown): string | undefined {
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
}

function getWeekStartDate(cycle: Cycle, weekIndex: number): string {
    const fromWeeks = cycle.weeks.find((week) => week.index === weekIndex)?.startDate;
    return fromWeeks ?? cycle.startDate;
}

function getWeekIndexFromDate(cycle: Cycle, date: string): number {
    if (!ISO_DATE_REGEX.test(date)) return 1;
    return getWeekIndexForDate(cycle, date);
}

function normalizeReviewEntries(entries: unknown[], cycle: Cycle): ReviewEntry[] {
    return entries
        .map((entry, index): ReviewEntry | null => {
            if (!entry || typeof entry !== "object") return null;
            const raw = entry as Partial<ReviewEntry> & Record<string, unknown>;
            if (!isValidReviewType(raw.type)) return null;

            const weekIndex = typeof raw.weekIndex === "number" && Number.isInteger(raw.weekIndex)
                ? clamp(raw.weekIndex, 1, 12)
                : raw.type === "weekly"
                    ? getWeekIndexFromDate(cycle, typeof raw.date === "string" ? raw.date : cycle.startDate)
                    : undefined;

            const fallbackDate = raw.type === "weekly" && weekIndex
                ? getWeekStartDate(cycle, weekIndex)
                : cycle.startDate;
            const date = typeof raw.date === "string" && ISO_DATE_REGEX.test(raw.date)
                ? raw.date
                : fallbackDate;

            const createdAt = typeof raw.createdAt === "string" && raw.createdAt.trim()
                ? raw.createdAt
                : `${date}T00:00:00.000Z`;
            const updatedAt = typeof raw.updatedAt === "string" && raw.updatedAt.trim()
                ? raw.updatedAt
                : createdAt;

            return {
                id: typeof raw.id === "string" && raw.id.trim() ? raw.id : `review-${index + 1}-${uid()}`,
                type: raw.type,
                date,
                weekIndex,
                createdAt,
                updatedAt,
                title: trimToUndefined(raw.title),
                content: trimToUndefined(raw.content),
                good: trimToUndefined(raw.good),
                bad: trimToUndefined(raw.bad),
                change: trimToUndefined(raw.change),
                signals: normalizeReviewSignals(raw.signals),
                source: isValidReviewSource(raw.source) ? raw.source : "migrated"
            };
        })
        .filter((entry): entry is ReviewEntry => entry !== null)
        .sort((a, b) => {
            if (a.date !== b.date) return b.date.localeCompare(a.date);
            if (a.createdAt !== b.createdAt) return b.createdAt.localeCompare(a.createdAt);
            return b.id.localeCompare(a.id);
        });
}

export function hasDailyReviewContent(review: DailyReview): boolean {
    return Boolean(review.good.trim() || review.bad.trim());
}

export function hasWeeklyReviewContent(review: WeeklyReview): boolean {
    return Boolean(review.good.trim() || review.bad.trim() || review.change.trim());
}

export function buildReviewEntriesFromLegacy(cycle: Cycle): ReviewEntry[] {
    const legacyEntries: ReviewEntry[] = [];

    Object.entries(cycle.dailyReviews).forEach(([date, review], index) => {
        if (!ISO_DATE_REGEX.test(date)) return;
        const normalizedReview: DailyReview = {
            good: review?.good ?? "",
            bad: review?.bad ?? ""
        };
        if (!hasDailyReviewContent(normalizedReview)) return;
        const createdAt = `${date}T00:00:00.000Z`;
        legacyEntries.push({
            id: `migrated-daily-${date}-${index}-${uid()}`,
            type: "daily",
            date,
            createdAt,
            updatedAt: createdAt,
            good: normalizedReview.good.trim() || undefined,
            bad: normalizedReview.bad.trim() || undefined,
            source: "migrated"
        });
    });

    Object.entries(cycle.weeklyReviews).forEach(([weekNum, review], index) => {
        const weekIndex = clamp(Number(weekNum) || 1, 1, 12);
        const normalizedReview: WeeklyReview = {
            good: review?.good ?? "",
            bad: review?.bad ?? "",
            change: review?.change ?? ""
        };
        if (!hasWeeklyReviewContent(normalizedReview)) return;
        const date = getWeekStartDate(cycle, weekIndex);
        const createdAt = `${date}T00:00:00.000Z`;
        legacyEntries.push({
            id: `migrated-weekly-${weekIndex}-${index}-${uid()}`,
            type: "weekly",
            date,
            weekIndex,
            createdAt,
            updatedAt: createdAt,
            good: normalizedReview.good.trim() || undefined,
            bad: normalizedReview.bad.trim() || undefined,
            change: normalizedReview.change.trim() || undefined,
            source: "migrated"
        });
    });

    (cycle.journalEntries ?? []).forEach((entry, index) => {
        const date = ISO_DATE_REGEX.test(entry.date) ? entry.date : cycle.startDate;
        const createdAt = entry.createdAt?.trim() || `${date}T00:00:00.000Z`;
        const title = entry.title?.trim();
        const content = entry.content?.trim();
        if (!title && !content) return;
        legacyEntries.push({
            id: entry.id || `migrated-custom-${index}-${uid()}`,
            type: "custom",
            date,
            createdAt,
            updatedAt: createdAt,
            title: title || undefined,
            content: content || undefined,
            signals: ["note"],
            source: "migrated"
        });
    });

    return normalizeReviewEntries(legacyEntries, cycle);
}

export function getWritableReviewEntries(cycle: Cycle): ReviewEntry[] {
    if (Array.isArray(cycle.reviewEntries) && cycle.reviewEntries.length > 0) {
        return normalizeReviewEntries(cycle.reviewEntries, cycle);
    }
    return buildReviewEntriesFromLegacy(cycle);
}

export function getReviewEntrySentiment(entry: ReviewEntry): ReviewSentiment {
    if (entry.type === "custom") return "neutral";
    const hasGood = Boolean(entry.good?.trim());
    const hasBad = Boolean(entry.bad?.trim());
    if (hasGood && hasBad) return "mixed";
    if (hasGood) return "positive";
    if (hasBad) return "negative";
    return "neutral";
}

export function getReviewEntrySearchText(entry: ReviewEntry): string {
    return [
        entry.title,
        entry.content,
        entry.good,
        entry.bad,
        entry.change
    ]
        .filter((part): part is string => typeof part === "string" && part.trim().length > 0)
        .join(" ")
        .toLowerCase();
}

export function getReviewEntrySignals(entry: ReviewEntry): ReviewSignal[] {
    if (entry.type === "custom") {
        const normalized = normalizeReviewSignals(entry.signals);
        return normalized && normalized.length > 0 ? normalized : ["note"];
    }

    const signals: ReviewSignal[] = [];
    if (entry.good?.trim()) signals.push("win");
    if (entry.bad?.trim()) signals.push("challenge");
    if (entry.type === "weekly" && entry.change?.trim()) signals.push("next_step");
    if (signals.length === 0) signals.push("note");
    return signals;
}

export function matchesSignalFilter(entry: ReviewEntry, selectedSignals: ReviewSignal[]): boolean {
    if (!selectedSignals.length) return true;
    const entrySignals = getReviewEntrySignals(entry);
    return selectedSignals.some((signal) => entrySignals.includes(signal));
}

export function upsertCurrentDailyReviewEntry(input: {
    entries: ReviewEntry[];
    date: string;
    review: DailyReview;
    source: "today_tab" | "journal";
}): ReviewEntry[] {
    const next = [...input.entries];
    const now = new Date().toISOString();
    const good = input.review.good.trim() || undefined;
    const bad = input.review.bad.trim() || undefined;
    const hasContent = Boolean(good || bad);

    const existingIndex = next.findIndex((entry) =>
        entry.type === "daily" &&
        entry.date === input.date &&
        entry.source === input.source
    );

    if (!hasContent) {
        if (existingIndex >= 0) next.splice(existingIndex, 1);
        return next;
    }

    if (existingIndex >= 0) {
        const existing = next[existingIndex];
        next[existingIndex] = {
            ...existing,
            good,
            bad,
            updatedAt: now
        };
        return next;
    }

    next.push({
        id: uid(),
        type: "daily",
        date: input.date,
        createdAt: now,
        updatedAt: now,
        good,
        bad,
        source: input.source
    });
    return next;
}

export function upsertCurrentWeeklyReviewEntry(input: {
    entries: ReviewEntry[];
    weekIndex: number;
    date: string;
    review: WeeklyReview;
    source: "week_tab" | "journal";
}): ReviewEntry[] {
    const next = [...input.entries];
    const now = new Date().toISOString();
    const good = input.review.good.trim() || undefined;
    const bad = input.review.bad.trim() || undefined;
    const change = input.review.change.trim() || undefined;
    const hasContent = Boolean(good || bad || change);

    const existingIndex = next.findIndex((entry) =>
        entry.type === "weekly" &&
        entry.weekIndex === input.weekIndex &&
        entry.source === input.source
    );

    if (!hasContent) {
        if (existingIndex >= 0) next.splice(existingIndex, 1);
        return next;
    }

    if (existingIndex >= 0) {
        const existing = next[existingIndex];
        next[existingIndex] = {
            ...existing,
            date: input.date,
            weekIndex: input.weekIndex,
            good,
            bad,
            change,
            updatedAt: now
        };
        return next;
    }

    next.push({
        id: uid(),
        type: "weekly",
        date: input.date,
        weekIndex: input.weekIndex,
        createdAt: now,
        updatedAt: now,
        good,
        bad,
        change,
        source: input.source
    });
    return next;
}

export function createJournalCustomReviewEntry(input: {
    title: string;
    content: string;
    date: string;
    signals?: ReviewSignal[];
}): ReviewEntry | null {
    const title = input.title.trim();
    const content = input.content.trim();
    if (!title && !content) return null;
    const now = new Date().toISOString();
    const normalizedSignals = normalizeReviewSignals(input.signals) ?? ["note"];
    return {
        id: uid(),
        type: "custom",
        date: input.date,
        createdAt: now,
        updatedAt: now,
        title: title || undefined,
        content: content || undefined,
        signals: normalizedSignals,
        source: "journal"
    };
}

export function createJournalDailyReviewEntry(input: {
    date: string;
    good: string;
    bad: string;
}): ReviewEntry | null {
    const review: DailyReview = {
        good: input.good,
        bad: input.bad
    };
    if (!hasDailyReviewContent(review)) return null;
    const now = new Date().toISOString();
    return {
        id: uid(),
        type: "daily",
        date: input.date,
        createdAt: now,
        updatedAt: now,
        good: review.good.trim() || undefined,
        bad: review.bad.trim() || undefined,
        source: "journal"
    };
}

export function createJournalWeeklyReviewEntry(input: {
    weekIndex: number;
    date: string;
    good: string;
    bad: string;
    change: string;
}): ReviewEntry | null {
    const review: WeeklyReview = {
        good: input.good,
        bad: input.bad,
        change: input.change
    };
    if (!hasWeeklyReviewContent(review)) return null;
    const now = new Date().toISOString();
    return {
        id: uid(),
        type: "weekly",
        date: input.date,
        weekIndex: clamp(input.weekIndex, 1, 12),
        createdAt: now,
        updatedAt: now,
        good: review.good.trim() || undefined,
        bad: review.bad.trim() || undefined,
        change: review.change.trim() || undefined,
        source: "journal"
    };
}

export function buildDemoCycle(): Cycle {
    const today = toIsoDate(new Date());
    const cycle = buildCycle("Demo‑Plan: Quarterly", today);
    cycle.vision = "In drei Jahren lebe ich gesund, ausgeglichen und habe ein profitables, stabiles Business.";

    const g1: Goal = { id: uid(), title: "Am Ende der 12 Wochen wiege ich 84 kg (aktuell 89 kg).", metric: "84 kg" };
    const g2: Goal = { id: uid(), title: "50.000 € Umsatz generieren durch Neukunden.", metric: "50.000 €" };
    const g3: Goal = { id: uid(), title: "Fokussierte Deep-Work-Routine etablieren.", metric: "5 Sessions/Woche" };
    cycle.goals = [g1, g2, g3];

    // Week 1 targets
    const t1_calls = { id: uid(), title: "Kaltakquise‑Anrufe", target: 50, unit: "Calls", done: 45 };
    const t1_sport = { id: uid(), title: "Sport", target: 5, unit: "Sessions", done: 5 };
    const t1_med = { id: uid(), title: "Meditation", target: 7, unit: "Tage", done: 6 };
    const t1_focus = { id: uid(), title: "Deep Work Sessions", target: 5, unit: "Sessions", done: 4 };

    // Week 2 targets  
    const t2_calls = { id: uid(), title: "Kaltakquise‑Anrufe", target: 50, unit: "Calls", done: 38 };
    const t2_sport = { id: uid(), title: "Sport", target: 5, unit: "Sessions", done: 4 };
    const t2_med = { id: uid(), title: "Meditation", target: 7, unit: "Tage", done: 7 };
    const t2_focus = { id: uid(), title: "Deep Work Sessions", target: 5, unit: "Sessions", done: 3 };
    const t2_book = { id: uid(), title: "Buch lesen", target: 50, unit: "Seiten", done: 30 };

    // Week 3 targets
    const t3_calls = { id: uid(), title: "Kaltakquise‑Anrufe", target: 60, unit: "Calls", done: 25 };
    const t3_sport = { id: uid(), title: "Sport", target: 5, unit: "Sessions", done: 2 };
    const t3_med = { id: uid(), title: "Meditation", target: 7, unit: "Tage", done: 3 };
    const t3_focus = { id: uid(), title: "Deep Work Sessions", target: 5, unit: "Sessions", done: 2 };

    // Week 4 targets (current week - in progress)
    const t4_calls = { id: uid(), title: "Kaltakquise‑Anrufe", target: 50, unit: "Calls", done: 12 };
    const t4_sport = { id: uid(), title: "Sport", target: 5, unit: "Sessions", done: 1 };
    const t4_content = { id: uid(), title: "Content erstellen", target: 3, unit: "Posts", done: 1 };

    cycle.weeklyTargets = {
        1: [t1_calls, t1_sport, t1_med, t1_focus],
        2: [t2_calls, t2_sport, t2_med, t2_focus, t2_book],
        3: [t3_calls, t3_sport, t3_med, t3_focus],
        4: [t4_calls, t4_sport, t4_content]
    };

    // Week 1 daily blocks
    const w1 = cycle.weeks[0];
    cycle.dailyPlans[w1.startDate] = [
        { id: uid(), startTime: "09:00", endTime: "10:00", title: "10 Kaltakquise‑Calls", linkedTargetId: t1_calls.id, done: true, actual: 10 },
        { id: uid(), startTime: "12:30", endTime: "13:10", title: "Laufen", linkedTargetId: t1_sport.id, done: true },
        { id: uid(), startTime: "20:30", endTime: "20:45", title: "Meditation", linkedTargetId: t1_med.id, done: true }
    ];
    cycle.dailyPlans[addDays(w1.startDate, 1)] = [
        { id: uid(), startTime: "08:00", endTime: "09:30", title: "Calls + Follow‑ups", linkedTargetId: t1_calls.id, done: true, actual: 15 },
        { id: uid(), startTime: "17:00", endTime: "18:00", title: "Gym", linkedTargetId: t1_sport.id, done: true }
    ];
    cycle.dailyPlans[addDays(w1.startDate, 5)] = [
        { id: uid(), startTime: "18:30", endTime: "20:00", title: "Deep-Work Wochenplanung", linkedTargetId: t1_focus.id, done: true }
    ];

    // Week 2 daily blocks
    const w2 = cycle.weeks[1];
    cycle.dailyPlans[w2.startDate] = [
        { id: uid(), startTime: "09:00", endTime: "11:00", title: "Calls Block", linkedTargetId: t2_calls.id, done: true, actual: 12 },
        { id: uid(), startTime: "06:30", endTime: "06:45", title: "Morgen-Meditation", linkedTargetId: t2_med.id, done: true }
    ];
    cycle.dailyPlans[addDays(w2.startDate, 2)] = [
        { id: uid(), startTime: "12:00", endTime: "13:00", title: "Schwimmen", linkedTargetId: t2_sport.id, done: true },
        { id: uid(), startTime: "21:00", endTime: "22:00", title: "Lesen vor dem Schlafen", linkedTargetId: t2_book.id, done: true, actual: 30 }
    ];

    // Week 3 daily blocks
    const w3 = cycle.weeks[2];
    cycle.dailyPlans[w3.startDate] = [
        { id: uid(), startTime: "09:00", endTime: "10:30", title: "Morning Calls", linkedTargetId: t3_calls.id, done: true, actual: 8 },
        { id: uid(), startTime: "18:00", endTime: "19:00", title: "Joggen", linkedTargetId: t3_sport.id, done: true }
    ];

    // Week 4 daily blocks (today's week)
    const w4 = cycle.weeks[3];
    cycle.dailyPlans[w4.startDate] = [
        { id: uid(), startTime: "09:00", endTime: "10:00", title: "Akquise Calls", linkedTargetId: t4_calls.id, done: true, actual: 8 },
        { id: uid(), startTime: "14:00", endTime: "15:00", title: "LinkedIn Post schreiben", linkedTargetId: t4_content.id, done: true }
    ];
    cycle.dailyPlans[addDays(w4.startDate, 1)] = [
        { id: uid(), startTime: "07:00", endTime: "08:00", title: "Morgensport", linkedTargetId: t4_sport.id, done: true },
        { id: uid(), startTime: "10:00", endTime: "11:00", title: "Follow‑up Calls", linkedTargetId: t4_calls.id, done: false, actual: 4 }
    ];

    // Sample reviews
    cycle.weeklyReviews = {
        1: { good: "Sehr produktive Woche! Calls-Ziel fast erreicht, Sport geschafft.", bad: "Zeitmanagement könnte besser sein, oft abgelenkt.", change: "Telefon in Fokuszeiten ausschalten." },
        2: { good: "Meditation täglich durchgehalten, fühlt sich großartig an.", bad: "Weniger Calls als geplant.", change: "Calls früher am Tag machen." }
    };

    cycle.dailyReviews = {};
    cycle.dailyReviews[w1.startDate] = { good: "Produktiver Start in die Woche!", bad: "Spätes Aufstehen." };
    cycle.dailyReviews[addDays(w1.startDate, 1)] = { good: "15 Calls geschafft!", bad: "Kein Zeit für Meditation." };
    cycle.dailyReviews[w2.startDate] = { good: "Früh aufgestanden, Meditation gemacht.", bad: "Nachmittags müde." };
    cycle.journalEntries = [
        {
            id: uid(),
            title: "Quarterly Fokus notiert",
            content: "Diese 12 Wochen steht konsequente Umsetzung vor Perfektion.",
            date: w1.startDate,
            createdAt: new Date().toISOString()
        }
    ];
    cycle.reviewEntries = buildReviewEntriesFromLegacy(cycle);

    // ─── Demo Habits ───
    const h1: Habit = { id: uid(), title: "Morgenroutine", emoji: "🌅", frequency: "daily", activeFrom: 1, activeTo: 12, startedAt: today, createdAt: today };
    const h2: Habit = { id: uid(), title: "Wasser trinken", emoji: "💧", frequency: "daily", activeFrom: 1, activeTo: 12, startedAt: today, createdAt: today };
    const h3: Habit = { id: uid(), title: "Journaling", emoji: "📝", frequency: "weekdays", activeFrom: 1, activeTo: 12, startedAt: today, createdAt: today };
    cycle.habits = [h1, h2, h3];

    // Sample habit log — simulate some completed habits across weeks
    cycle.habitLog = {};
    for (let wi = 0; wi < 3; wi++) {
        const week = cycle.weeks[wi];
        for (let d = 0; d < 7; d++) {
            const date = addDays(week.startDate, d);
            const dayOfWeek = parseIso(date).getDay();
            const log: string[] = [];
            // Morgenroutine: done most days
            if (Math.random() > 0.15) log.push(h1.id);
            // Wasser: done almost every day
            if (Math.random() > 0.1) log.push(h2.id);
            // Journaling: only weekdays (Mon-Fri = 1-5)
            if (dayOfWeek >= 1 && dayOfWeek <= 5 && Math.random() > 0.2) log.push(h3.id);
            if (log.length > 0) cycle.habitLog[date] = log;
        }
    }
    // Current week (week 4): only first 2 days
    for (let d = 0; d < 2; d++) {
        const date = addDays(w4.startDate, d);
        const dayOfWeek = parseIso(date).getDay();
        const log: string[] = [h1.id, h2.id];
        if (dayOfWeek >= 1 && dayOfWeek <= 5) log.push(h3.id);
        cycle.habitLog[date] = log;
    }

    return cycle;
}

// ─── Verification & Helpers ───
export function isHabitPlannedOnDate(cycle: Cycle, habit: Habit, date: string): boolean {
    if (habit.startedAt && date < habit.startedAt) return false;
    if (!Array.isArray(cycle.weeks) || cycle.weeks.length === 0) return false;

    const cycleStart = cycle.weeks[0]?.startDate;
    const cycleEnd = cycle.weeks[cycle.weeks.length - 1]?.endDate;
    if (!cycleStart || !cycleEnd) return false;
    if (date < cycleStart || date > cycleEnd) return false;

    const weekIdx = getWeekIndexForDate(cycle, date);
    if (weekIdx < habit.activeFrom || weekIdx > habit.activeTo) return false;

    const dayOfWeek = parseIso(date).getDay();
    if (habit.frequency === 'daily') return true;
    if (habit.frequency === 'weekdays') return dayOfWeek >= 1 && dayOfWeek <= 5;
    if (Array.isArray(habit.frequency)) return habit.frequency.includes(dayOfWeek);
    return false;
}

export function migrateCycle(raw: any): Cycle | null {
    if (!raw) return null;
    if ((raw as Cycle).weeklyTargets) {
        const cycle = raw as Cycle;
        const asBool = (value: unknown): boolean => {
            if (typeof value === "boolean") return value;
            if (typeof value === "string") {
                const normalized = value.trim().toLowerCase();
                if (normalized === "true") return true;
                if (normalized === "false") return false;
            }
            return false;
        };
        const asSafeNumber = (value: unknown, fallback = 0): number => {
            if (typeof value === "number" && Number.isFinite(value)) return value;
            if (typeof value === "string" && value.trim()) {
                const parsed = Number(value);
                if (Number.isFinite(parsed)) return parsed;
            }
            return fallback;
        };

        // Backfill habits and habitLog for older cycles
        if (!cycle.habits) cycle.habits = [];
        if (!cycle.habitLog) cycle.habitLog = {};
        if (!cycle.dailyPlans) cycle.dailyPlans = {};
        if (!Array.isArray(cycle.journalEntries)) cycle.journalEntries = [];

        cycle.habits = cycle.habits.map((h) => ({
            ...h,
            startedAt: h.startedAt ?? h.createdAt ?? cycle.startDate
        }));

        const normalizedPlans: Record<string, DailyBlock[]> = {};
        Object.entries(cycle.dailyPlans).forEach(([date, blocks]) => {
            if (!Array.isArray(blocks)) return;
            const normalizedBlocks: DailyBlock[] = [];
            blocks.forEach((block, index) => {
                if (!block || typeof block !== "object") return;
                const rawBlock = block as Partial<DailyBlock> & Record<string, unknown>;

                const amountValue = asSafeNumber(rawBlock.amount, 0);
                const amount = amountValue >= 1 ? Math.floor(amountValue) : undefined;
                const rawActual = Math.max(0, Math.floor(asSafeNumber(rawBlock.actual, 0)));
                const actual = amount ? clamp(rawActual, 0, amount) : rawActual;
                const done = amount ? actual >= amount : asBool(rawBlock.done);

                normalizedBlocks.push({
                    id: typeof rawBlock.id === "string" && rawBlock.id.trim() ? rawBlock.id : uid(),
                    startTime: typeof rawBlock.startTime === "string" && rawBlock.startTime ? rawBlock.startTime : "09:00",
                    endTime: typeof rawBlock.endTime === "string" && rawBlock.endTime ? rawBlock.endTime : "10:00",
                    title: typeof rawBlock.title === "string" && rawBlock.title.trim() ? rawBlock.title : `Block ${index + 1}`,
                    linkedTargetId: typeof rawBlock.linkedTargetId === "string" && rawBlock.linkedTargetId ? rawBlock.linkedTargetId : undefined,
                    done,
                    amount,
                    actual,
                    googleEventId: typeof rawBlock.googleEventId === "string" && rawBlock.googleEventId ? rawBlock.googleEventId : undefined
                });
            });

            if (normalizedBlocks.length > 0) {
                normalizedPlans[date] = normalizedBlocks;
            }
        });
        cycle.dailyPlans = normalizedPlans;

        cycle.journalEntries = cycle.journalEntries
            .filter((entry) => entry && typeof entry === "object")
            .map((entry: any, index: number) => {
                const date = typeof entry.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(entry.date)
                    ? entry.date
                    : cycle.startDate;
                return {
                    id: typeof entry.id === "string" && entry.id.trim() ? entry.id : uid(),
                    title: typeof entry.title === "string" && entry.title.trim() ? entry.title.trim() : `Journal ${index + 1}`,
                    content: typeof entry.content === "string" ? entry.content : "",
                    date,
                    createdAt: typeof entry.createdAt === "string" && entry.createdAt.trim()
                        ? entry.createdAt
                        : `${date}T00:00:00.000Z`
                };
            });

        if (Array.isArray((cycle as Cycle & { reviewEntries?: unknown[] }).reviewEntries)
            && (cycle as Cycle & { reviewEntries?: unknown[] }).reviewEntries!.length > 0) {
            cycle.reviewEntries = normalizeReviewEntries(
                (cycle as Cycle & { reviewEntries?: unknown[] }).reviewEntries!,
                cycle
            );
        } else {
            cycle.reviewEntries = buildReviewEntriesFromLegacy(cycle);
        }

        // CLEANUP: Remove future habit logs
        const today = toIsoDate(new Date());
        Object.keys(cycle.habitLog).forEach((date) => {
            if (date > today) {
                delete cycle.habitLog[date];
            }
        });

        return cycle;
    }
    return null;
}

// ─── Reducer ───
export const cycleReducer = (state: CycleState, action: CycleAction): CycleState => {
    switch (action.type) {
        case 'SET':
            return { present: action.payload, past: [], future: [] };
        case 'UPDATE':
            if (!state.present) return state;
            const newPresent = action.updateFn(state.present);
            if (newPresent === state.present) return state;
            return {
                past: [...state.past.slice(-19), state.present], // Keep last 20
                present: newPresent,
                future: []
            };
        case 'UNDO':
            if (state.past.length === 0 || !state.present) return state;
            const previous = state.past[state.past.length - 1];
            const newPast = state.past.slice(0, -1);
            return {
                past: newPast,
                present: previous,
                future: [state.present, ...state.future]
            };
        case 'REDO':
            if (state.future.length === 0 || !state.present) return state;
            const next = state.future[0];
            const newFuture = state.future.slice(1);
            return {
                past: [...state.past, state.present],
                present: next,
                future: newFuture
            };
        default:
            return state;
    }
};
