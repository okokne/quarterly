import test from "node:test";
import assert from "node:assert/strict";
import {
    buildCycle,
    createJournalQuickReviewEntry,
    getReviewEntrySignals,
    getReviewEntrySentiment,
    matchesSignalFilter,
    migrateCycle,
    upsertCurrentDailyReviewEntry,
    upsertCurrentWeeklyReviewEntry
} from "../src/utils";
import { ReviewEntry } from "../src/types";

test("migrateCycle builds reviewEntries from legacy review maps without duplicating on re-migrate", () => {
    const cycle = buildCycle("Journal v2", "2026-02-09");
    cycle.dailyReviews = {
        "2026-02-10": {
            good: "Morning routine done",
            bad: ""
        }
    };
    cycle.weeklyReviews = {
        1: {
            good: "",
            bad: "Too many meetings",
            change: "Block no-meeting mornings"
        }
    };
    cycle.journalEntries = [
        {
            id: "journal-1",
            title: "Custom note",
            content: "Keep it simple",
            date: "2026-02-11",
            createdAt: "2026-02-11T09:00:00.000Z"
        }
    ];

    const migratedOnce = migrateCycle(JSON.parse(JSON.stringify(cycle)));
    assert.ok(migratedOnce, "first migration should return a cycle");
    assert.equal(migratedOnce?.reviewEntries?.length, 3);
    const migratedCustom = migratedOnce?.reviewEntries?.find((entry) => entry.type === "custom");
    assert.deepEqual(migratedCustom?.signals, ["note"], "legacy custom entries should default to note signal");

    const migratedTwice = migrateCycle(JSON.parse(JSON.stringify(migratedOnce)));
    assert.ok(migratedTwice, "second migration should return a cycle");
    assert.equal(
        migratedTwice?.reviewEntries?.length,
        migratedOnce?.reviewEntries?.length,
        "re-migration must keep review entry count stable"
    );
});

test("getReviewEntrySentiment maps daily/weekly/custom entries correctly", () => {
    const dailyPositive: ReviewEntry = {
        id: "a",
        type: "daily",
        date: "2026-02-11",
        createdAt: "2026-02-11T09:00:00.000Z",
        updatedAt: "2026-02-11T09:00:00.000Z",
        good: "Great focus",
        source: "journal"
    };
    const weeklyNegative: ReviewEntry = {
        id: "b",
        type: "weekly",
        date: "2026-02-09",
        weekIndex: 1,
        createdAt: "2026-02-11T09:00:00.000Z",
        updatedAt: "2026-02-11T09:00:00.000Z",
        bad: "No planning",
        source: "week_tab"
    };
    const mixedEntry: ReviewEntry = {
        id: "c",
        type: "daily",
        date: "2026-02-11",
        createdAt: "2026-02-11T09:00:00.000Z",
        updatedAt: "2026-02-11T09:00:00.000Z",
        good: "Workout done",
        bad: "Ate late",
        source: "today_tab"
    };
    const customEntry: ReviewEntry = {
        id: "d",
        type: "custom",
        date: "2026-02-11",
        createdAt: "2026-02-11T09:00:00.000Z",
        updatedAt: "2026-02-11T09:00:00.000Z",
        title: "Note",
        source: "journal"
    };

    assert.equal(getReviewEntrySentiment(dailyPositive), "positive");
    assert.equal(getReviewEntrySentiment(weeklyNegative), "negative");
    assert.equal(getReviewEntrySentiment(mixedEntry), "mixed");
    assert.equal(getReviewEntrySentiment(customEntry), "neutral");
});

test("getReviewEntrySignals maps entries to practical feed signals", () => {
    const dailyMixed: ReviewEntry = {
        id: "s1",
        type: "daily",
        date: "2026-02-11",
        createdAt: "2026-02-11T09:00:00.000Z",
        updatedAt: "2026-02-11T09:00:00.000Z",
        good: "Deep work block done",
        bad: "Too many interruptions",
        source: "today_tab"
    };
    const weeklyWithNextStep: ReviewEntry = {
        id: "s2",
        type: "weekly",
        date: "2026-02-09",
        weekIndex: 1,
        createdAt: "2026-02-11T09:00:00.000Z",
        updatedAt: "2026-02-11T09:00:00.000Z",
        change: "Protect mornings",
        source: "week_tab"
    };
    const customDefault: ReviewEntry = {
        id: "s3",
        type: "custom",
        date: "2026-02-11",
        createdAt: "2026-02-11T09:00:00.000Z",
        updatedAt: "2026-02-11T09:00:00.000Z",
        content: "Random thought",
        source: "journal"
    };
    const customTagged: ReviewEntry = {
        id: "s4",
        type: "custom",
        date: "2026-02-11",
        createdAt: "2026-02-11T09:00:00.000Z",
        updatedAt: "2026-02-11T09:00:00.000Z",
        content: "Small win",
        signals: ["win", "challenge"],
        source: "journal"
    };

    assert.deepEqual(getReviewEntrySignals(dailyMixed), ["win", "challenge"]);
    assert.deepEqual(getReviewEntrySignals(weeklyWithNextStep), ["next_step"]);
    assert.deepEqual(getReviewEntrySignals(customDefault), ["note"]);
    assert.deepEqual(getReviewEntrySignals(customTagged), ["win", "challenge"]);
});

test("createJournalQuickReviewEntry creates quick entries with optional context", () => {
    const quickEntry = createJournalQuickReviewEntry({
        title: "",
        content: "Idea for a better opener script",
        date: "2026-02-14",
        weekIndex: 2,
        contextId: "sales"
    });
    assert.ok(quickEntry, "quick entry should be created when content exists");
    assert.equal(quickEntry?.type, "quick");
    assert.equal(quickEntry?.contextId, "sales");
    assert.deepEqual(getReviewEntrySignals(quickEntry!), ["note"]);
    assert.equal(getReviewEntrySentiment(quickEntry!), "neutral");
});

test("matchesSignalFilter uses OR logic for multi-select", () => {
    const entry: ReviewEntry = {
        id: "f1",
        type: "daily",
        date: "2026-02-11",
        createdAt: "2026-02-11T09:00:00.000Z",
        updatedAt: "2026-02-11T09:00:00.000Z",
        good: "Strong output",
        bad: "Late start",
        source: "today_tab"
    };

    assert.equal(matchesSignalFilter(entry, []), true, "empty signal filter should pass all entries");
    assert.equal(matchesSignalFilter(entry, ["win"]), true);
    assert.equal(matchesSignalFilter(entry, ["challenge"]), true);
    assert.equal(matchesSignalFilter(entry, ["next_step", "win"]), true, "OR logic should match when at least one selected signal exists");
    assert.equal(matchesSignalFilter(entry, ["note"]), false);
});

test("upsertCurrentDailyReviewEntry updates one current entry and removes it when empty", () => {
    const date = "2026-02-11";
    const first = upsertCurrentDailyReviewEntry({
        entries: [],
        date,
        review: { good: "Strong start", bad: "" },
        source: "today_tab"
    });
    assert.equal(first.length, 1);
    assert.equal(first[0].good, "Strong start");

    const second = upsertCurrentDailyReviewEntry({
        entries: first,
        date,
        review: { good: "", bad: "Lost focus" },
        source: "today_tab"
    });
    assert.equal(second.length, 1, "daily upsert should keep one current entry per source/date");
    assert.equal(second[0].good, undefined);
    assert.equal(second[0].bad, "Lost focus");

    const third = upsertCurrentDailyReviewEntry({
        entries: second,
        date,
        review: { good: "", bad: "" },
        source: "today_tab"
    });
    assert.equal(third.length, 0, "empty daily review should remove current review entry");
});

test("upsertCurrentWeeklyReviewEntry updates one current entry and removes it when empty", () => {
    const first = upsertCurrentWeeklyReviewEntry({
        entries: [],
        weekIndex: 2,
        date: "2026-02-16",
        review: { good: "Good cadence", bad: "", change: "" },
        source: "week_tab"
    });
    assert.equal(first.length, 1);
    assert.equal(first[0].weekIndex, 2);

    const second = upsertCurrentWeeklyReviewEntry({
        entries: first,
        weekIndex: 2,
        date: "2026-02-16",
        review: { good: "", bad: "", change: "Plan evenings better" },
        source: "week_tab"
    });
    assert.equal(second.length, 1, "weekly upsert should keep one current entry per source/week");
    assert.equal(second[0].good, undefined);
    assert.equal(second[0].change, "Plan evenings better");

    const third = upsertCurrentWeeklyReviewEntry({
        entries: second,
        weekIndex: 2,
        date: "2026-02-16",
        review: { good: "", bad: "", change: "" },
        source: "week_tab"
    });
    assert.equal(third.length, 0, "empty weekly review should remove current review entry");
});
