import test from "node:test";
import assert from "node:assert/strict";
import { Book } from "../src/types";
import {
    getBookActivityTimestamp,
    getNextQueueOrder,
    getBookProgressPercent,
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

test("normalizeBookRecord moves book to reading when progress exists", () => {
    const normalized = normalizeBookRecord(createBook({ readPages: 24 }), "2026-02-22");
    assert.equal(normalized.status, "reading");
    assert.equal(normalized.startDate, "2026-02-22");
    assert.equal(normalized.finishDate, undefined);
});

test("normalizeBookRecord maps legacy wishlist books to reading queue", () => {
    const normalized = normalizeBookRecord(
        createBook({ status: "want_to_read", readPages: 0, queueOrder: 3 }),
        "2026-02-22"
    );
    assert.equal(normalized.status, "reading");
    assert.equal(normalized.queueOrder, 3);
    assert.equal(normalized.startDate, undefined);
});

test("normalizeBookRecord marks finished book with full progress and finish date", () => {
    const normalized = normalizeBookRecord(
        createBook({ status: "finished", totalPages: 210, readPages: 17 }),
        "2026-02-22"
    );
    assert.equal(normalized.readPages, 210);
    assert.equal(normalized.status, "finished");
    assert.equal(normalized.startDate, "2026-02-22");
    assert.equal(normalized.finishDate, "2026-02-22");
});

test("normalizeBookRecord clamps overread pages and infers finished state", () => {
    const normalized = normalizeBookRecord(
        createBook({ status: "reading", totalPages: 100, readPages: 145 }),
        "2026-02-22"
    );
    assert.equal(normalized.readPages, 100);
    assert.equal(normalized.status, "finished");
});

test("sanitizeBookCategories trims, removes empties, and deduplicates", () => {
    const categories = sanitizeBookCategories([" Fantasy ", "", "Fantasy", "Biography", "  Biography  "]);
    assert.deepEqual(categories, ["Fantasy", "Biography"]);
});

test("session helpers keep latest entries first and expose activity timestamp", () => {
    const sessions = sortBookSessionsByDateDesc([
        { id: "s1", date: "2026-02-18T09:30:00.000Z", pagesRead: 70 },
        { id: "s2", date: "2026-02-20T09:30:00.000Z", pagesRead: 90 }
    ]);
    assert.equal(sessions[0]?.id, "s2");

    const activityTs = getBookActivityTimestamp(createBook({ sessions }));
    assert.equal(activityTs, new Date("2026-02-20T09:30:00.000Z").getTime());
});

test("getBookProgressPercent returns rounded percentage and guards missing totals", () => {
    assert.equal(getBookProgressPercent({ readPages: 45, totalPages: 180 }), 25);
    assert.equal(getBookProgressPercent({ readPages: 5, totalPages: 0 }), 0);
});

test("queue helpers return stable order and next position", () => {
    const books = [
        createBook({ id: "b1", title: "One", queueOrder: 2, status: "reading", readPages: 0 }),
        createBook({ id: "b2", title: "Two", queueOrder: 1, status: "reading", readPages: 0 }),
        createBook({ id: "b3", title: "Three", status: "finished", readPages: 100, totalPages: 100 })
    ];
    const sorted = sortQueueBooks(books.filter((book) => book.status !== "finished"));
    assert.equal(sorted[0]?.id, "b2");
    assert.equal(getNextQueueOrder(books), 3);
});
