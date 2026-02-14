import {
    Cycle,
    DailyReview,
    ReviewEntry,
    ReviewEntrySource,
    ReviewSentiment,
    ReviewSignal,
    WeeklyReview
} from "../types";
import { clamp, getWeekIndexForDate } from "./cycleMath";
import { uid } from "./id";

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function isValidReviewType(value: unknown): value is ReviewEntry["type"] {
    return value === "daily" || value === "weekly" || value === "custom" || value === "quick";
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

function normalizeContextId(value: unknown, cycle: Cycle): string | undefined {
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    return cycle.journalContexts?.some((context) => context.id === trimmed) ? trimmed : undefined;
}

function getWeekStartDate(cycle: Cycle, weekIndex: number): string {
    const fromWeeks = cycle.weeks.find((week) => week.index === weekIndex)?.startDate;
    return fromWeeks ?? cycle.startDate;
}

function getWeekIndexFromDate(cycle: Cycle, date: string): number {
    if (!ISO_DATE_REGEX.test(date)) return 1;
    return getWeekIndexForDate(cycle, date);
}

export function normalizeReviewEntries(entries: unknown[], cycle: Cycle): ReviewEntry[] {
    return entries
        .map((entry, index): ReviewEntry | null => {
            if (!entry || typeof entry !== "object") return null;
            const raw = entry as Partial<ReviewEntry> & Record<string, unknown>;
            if (!isValidReviewType(raw.type)) return null;

            const weekIndex = typeof raw.weekIndex === "number" && Number.isInteger(raw.weekIndex)
                ? clamp(raw.weekIndex, 1, 12)
                : raw.type === "weekly" || raw.type === "quick"
                    ? getWeekIndexFromDate(cycle, typeof raw.date === "string" ? raw.date : cycle.startDate)
                    : undefined;

            const fallbackDate = (raw.type === "weekly" || raw.type === "quick") && weekIndex
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
                contextId: normalizeContextId(raw.contextId, cycle),
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
    if (entry.type === "custom" || entry.type === "quick") return "neutral";
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
    if (entry.type === "custom" || entry.type === "quick") {
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
    contextId?: string;
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
        contextId: input.contextId?.trim() || undefined,
        signals: normalizedSignals,
        source: "journal"
    };
}

export function createJournalQuickReviewEntry(input: {
    title: string;
    content: string;
    date: string;
    weekIndex: number;
    contextId?: string;
}): ReviewEntry | null {
    const title = input.title.trim();
    const content = input.content.trim();
    if (!title && !content) return null;
    const now = new Date().toISOString();
    return {
        id: uid(),
        type: "quick",
        date: input.date,
        weekIndex: clamp(input.weekIndex, 1, 12),
        createdAt: now,
        updatedAt: now,
        title: title || undefined,
        content: content || undefined,
        contextId: input.contextId?.trim() || undefined,
        signals: ["note"],
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
