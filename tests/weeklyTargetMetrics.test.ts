import test from "node:test";
import assert from "node:assert/strict";
import { buildCycle, getEffectiveWeeklyDone, migrateCycle } from "../src/utils";

test("effective weekly done combines auto progress and manual adjustment", () => {
    const cycle = buildCycle("Target Test", "2026-01-05");
    const week = cycle.weeks[0];
    cycle.weeklyTargets[1] = [
        {
            id: "target-1",
            title: "Calls",
            target: 10,
            unit: "calls",
            manualAdjust: 2
        }
    ];
    cycle.dailyPlans[week.startDate] = [
        {
            id: "block-1",
            title: "Call Block",
            startTime: "09:00",
            endTime: "10:00",
            linkedTargetId: "target-1",
            done: true,
            actual: 5
        }
    ];

    const done = getEffectiveWeeklyDone(cycle, 1, cycle.weeklyTargets[1][0]);
    assert.equal(done, 7);
});

test("effective weekly done is clamped between zero and target", () => {
    const cycle = buildCycle("Clamp Test", "2026-01-05");
    cycle.weeklyTargets[1] = [
        { id: "a", title: "A", target: 10, manualAdjust: 99 },
        { id: "b", title: "B", target: 10, manualAdjust: -99 }
    ];

    const high = getEffectiveWeeklyDone(cycle, 1, cycle.weeklyTargets[1][0]);
    const low = getEffectiveWeeklyDone(cycle, 1, cycle.weeklyTargets[1][1]);
    assert.equal(high, 10);
    assert.equal(low, 0);
});

test("migrateCycle converts legacy done field to manualAdjust offset", () => {
    const raw = buildCycle("Legacy Target", "2026-01-05");
    const week = raw.weeks[0];
    raw.weeklyTargets[1] = [
        {
            id: "legacy-target",
            title: "Legacy",
            target: 10,
            done: 6
        } as any
    ];
    raw.dailyPlans[week.startDate] = [
        {
            id: "legacy-block",
            title: "Legacy block",
            startTime: "09:00",
            endTime: "10:00",
            linkedTargetId: "legacy-target",
            done: true,
            actual: 2
        }
    ];

    const migrated = migrateCycle(raw);
    assert.ok(migrated);
    assert.equal(migrated!.weeklyTargets[1][0].manualAdjust, 4);
});
