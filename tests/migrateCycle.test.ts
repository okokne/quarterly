import test from "node:test";
import assert from "node:assert/strict";
import { buildCycle, buildWeekLabel, migrateCycle, normalizeWeekName } from "../src/utils";

test("migrateCycle coerces legacy boolean strings and clamps counter values", () => {
    const startDate = "2026-02-09";
    const cycle = buildCycle("Legacy", startDate);

    const legacyLike = {
        ...cycle,
        dailyPlans: {
            [startDate]: [
                {
                    id: "legacy-1",
                    startTime: "08:00",
                    endTime: "09:00",
                    title: "Legacy Block",
                    done: "false",
                    amount: "4",
                    actual: "9"
                }
            ]
        }
    };

    const migratedCycle = migrateCycle(legacyLike);
    assert.ok(migratedCycle, "migrated cycle should exist");
    if (!migratedCycle) {
        throw new Error("Expected migrated cycle to be present");
    }
    const block = migratedCycle.dailyPlans[startDate]?.[0];
    assert.ok(block, "migrated block should exist");
    assert.equal(block.done, true, "counter block with actual >= target should be marked done");
    assert.equal(block.amount, 4);
    assert.equal(block.actual, 4, "actual must be clamped to planned amount");
});

test("migrateCycle seeds journal contexts when missing", () => {
    const cycle = buildCycle("Legacy contexts", "2026-02-09");
    const legacyLike = {
        ...cycle,
        journalContexts: undefined,
        defaultJournalContextId: undefined
    };

    const migratedCycle = migrateCycle(legacyLike);
    assert.ok(migratedCycle, "migrated cycle should exist");
    if (!migratedCycle) {
        throw new Error("Expected migrated cycle to be present");
    }

    assert.ok((migratedCycle.journalContexts ?? []).length >= 1, "contexts should be initialized");
    assert.ok(migratedCycle.defaultJournalContextId, "default context should be set");
});

test("migrateCycle normalizes week names", () => {
    const cycle = buildCycle("Weeks", "2026-02-09");
    const legacyLike = {
        ...cycle,
        weeks: cycle.weeks.map((week) => (
            week.index === 2
                ? { ...week, weekName: "   Momentum   Week   " }
                : week
        ))
    };
    const migratedCycle = migrateCycle(legacyLike);
    assert.ok(migratedCycle, "migrated cycle should exist");
    const weekTwoName = migratedCycle?.weeks.find((week) => week.index === 2)?.weekName;
    assert.equal(weekTwoName, "Momentum Week");
});

test("week label includes optional week name", () => {
    assert.equal(normalizeWeekName("   "), undefined);
    assert.equal(buildWeekLabel("en", 4, "Momentum Week"), "Week 4 - Momentum Week");
    assert.equal(buildWeekLabel("de", 4), "Woche 4");
});
