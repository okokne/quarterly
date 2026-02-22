import test from "node:test";
import assert from "node:assert/strict";
import { Book } from "../src/types";
import {
    getBookCompletionStats,
    getBookProgressPercent,
    getFinishedBooksInYear,
    getNextQueueOrder,
    getPagesReadThisWeek,
    getReadingStreakDays,
    normalizeBookRecord,
    sanitizeBookCategories,
    sortQueueBooks,
    sortBookSessionsByDateDesc
} from "../src/utils/books";

function createBook(overrides: Partial<Book> = {}): Book {
    return {
        id: "book-1",
        title: "Atomic Habits",
        author: "James Clear",
        categories: [],
        totalPages: 300,
        readPages: 0,
        status: "want_to_read",
        sessions: [],
        ...overrides
    };
}

test("normalizeBookRecord keeps want_to_read status even when progress exists", () => {
    const normalized = normalizeBookRecord(createBook({ readPages: 24 }), "2026-02-22");
    assert.equal(normalized.status, "want_to_read");
    assert.equal(normalized.startDate, undefined);
    assert.equal(normalized.finishDate, undefined);
});

test("normalizeBookRecord preserves want_to_read status when there is no progress", () => {
    const normalized = normalizeBookRecord(createBook({ readPages: 0 }), "2026-02-22");
    assert.equal(normalized.status, "want_to_read");
    assert.equal(normalized.startDate, undefined);
});

test("normalizeBookRecord migrates legacy queue-style reading entries back to want_to_read", () => {
    const normalized = normalizeBookRecord(
        createBook({ status: "reading", readPages: 0, startDate: undefined, sessions: [] }),
        "2026-02-22"
    );
    assert.equal(normalized.status, "want_to_read");
});

test("normalizeBookRecord marks finished book with full progress and finish date", () => {
    const normalized = normalizeBookRecord(
        createBook({ status: "finished", totalPages: 210, readPages: 17 }),
        "2026-02-22"
    );
    assert.equal(normalized.readPages, 210);
    assert.equal(normalized.status, "finished");
    assert.equal(normalized.finishDate, "2026-02-22");
});

test("sanitizeBookCategories trims, removes empties, and deduplicates", () => {
    const categories = sanitizeBookCategories([" Fantasy ", "", "Fantasy", "Biography", "  Biography  "]);
    assert.deepEqual(categories, ["Fantasy", "Biography"]);
});

test("session helpers keep latest entries first", () => {
    const sessions = sortBookSessionsByDateDesc([
        { id: "s1", date: "2026-02-18T09:30:00.000Z", pagesRead: 70 },
        { id: "s2", date: "2026-02-20T09:30:00.000Z", pagesRead: 90 }
    ]);
    assert.equal(sessions[0]?.id, "s2");
});

test("getBookProgressPercent returns rounded percentage and guards missing totals", () => {
    assert.equal(getBookProgressPercent({ readPages: 45, totalPages: 180 }), 25);
    assert.equal(getBookProgressPercent({ readPages: 5, totalPages: 0 }), 0);
});

test("getReadingStreakDays counts consecutive days from the latest session", () => {
    const book = createBook({
        status: "reading",
        sessions: [
            { id: "s1", date: "2026-02-20T10:00:00.000Z", pagesRead: 20 },
            { id: "s2", date: "2026-02-21T10:00:00.000Z", pagesRead: 40 },
            { id: "s3", date: "2026-02-22T10:00:00.000Z", pagesRead: 60 }
        ]
    });
    assert.equal(getReadingStreakDays([book], "2026-02-22"), 3);
});

test("getPagesReadThisWeek sums session increments inside current week", () => {
    const book = createBook({
        status: "reading",
        sessions: [
            { id: "s1", date: "2026-02-16T10:00:00.000Z", pagesRead: 20 },
            { id: "s2", date: "2026-02-18T10:00:00.000Z", pagesRead: 45 },
            { id: "s3", date: "2026-02-22T10:00:00.000Z", pagesRead: 60 }
        ]
    });
    // Monday of this week is 2026-02-16
    assert.equal(getPagesReadThisWeek([book], "2026-02-22"), 60);
});

test("getPagesReadThisWeek supports additive session logs with pageAfter", () => {
    const book = createBook({
        status: "reading",
        sessions: [
            { id: "s1", date: "2026-02-17T10:00:00.000Z", pagesRead: 12, pageAfter: 12 },
            { id: "s2", date: "2026-02-19T10:00:00.000Z", pagesRead: 18, pageAfter: 30, durationMinutes: 24 },
            { id: "s3", date: "2026-02-22T10:00:00.000Z", pagesRead: 15, pageAfter: 45, notes: "Good chapter" }
        ]
    });
    assert.equal(getPagesReadThisWeek([book], "2026-02-22"), 45);
});

test("getFinishedBooksInYear counts only books completed in target year", () => {
    const books = [
        createBook({ id: "a", status: "finished", finishDate: "2026-01-10" }),
        createBook({ id: "b", status: "finished", finishDate: "2025-12-31" }),
        createBook({ id: "c", status: "reading" })
    ];
    assert.equal(getFinishedBooksInYear(books, 2026), 1);
});

test("getBookCompletionStats returns duration and average pages per day", () => {
    const stats = getBookCompletionStats(createBook({
        status: "finished",
        totalPages: 280,
        readPages: 280,
        startDate: "2026-02-01",
        finishDate: "2026-02-10"
    }));
    assert.equal(stats.totalPages, 280);
    assert.equal(stats.readingDays, 10);
    assert.equal(stats.pagesPerDay, 28);
});

test("queue helpers sort and determine next order", () => {
    const books = [
        createBook({ id: "a", status: "want_to_read", queueOrder: 3 }),
        createBook({ id: "b", status: "want_to_read", queueOrder: 1 }),
        createBook({ id: "c", status: "reading", queueOrder: 2 })
    ];
    const sorted = sortQueueBooks(books.filter((book) => book.status === "want_to_read"));
    assert.equal(sorted[0]?.id, "b");
    assert.equal(getNextQueueOrder(books), 4);
});
