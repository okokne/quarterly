import test from "node:test";
import assert from "node:assert/strict";
import { buildCycle, getCurrentWeekIndex, getWeekIndexForDate } from "../src/utils";

test("getCurrentWeekIndex clamps to week 1 before cycle start", () => {
    assert.equal(getCurrentWeekIndex("2026-01-05", "2026-01-01"), 1);
});

test("getCurrentWeekIndex returns the correct in-cycle week", () => {
    assert.equal(getCurrentWeekIndex("2026-01-05", "2026-01-29"), 4);
});

test("getCurrentWeekIndex clamps to week 12 after cycle end", () => {
    assert.equal(getCurrentWeekIndex("2026-01-05", "2026-05-15"), 12);
});

test("getCurrentWeekIndex normalizes Date input to local start of day", () => {
    const lateEvening = new Date(2026, 0, 12, 23, 59, 59);
    assert.equal(getCurrentWeekIndex("2026-01-05", lateEvening), 2);
});

test("getWeekIndexForDate delegates to current-week calculation with cycle boundaries", () => {
    const cycle = buildCycle("Quarter", "2026-01-05");

    assert.equal(getWeekIndexForDate(cycle, "2026-01-29"), 4);
    assert.equal(getWeekIndexForDate(cycle, "2025-12-01"), 1);
    assert.equal(getWeekIndexForDate(cycle, "2026-06-01"), 12);
});
