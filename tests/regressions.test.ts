import test from "node:test";
import assert from "node:assert/strict";
import {
    canToggleHabitCell,
    getExpandedHabitDateWindow,
    getBlockCompletionState,
    getGoalWeekChipClass,
    getHabitCellVisualState,
    toggleHabitLogEntry
} from "../src/regressionLogic";

test("block completion state respects counter progress instead of stale done flag", () => {
    const inProgress = getBlockCompletionState({
        amount: 5,
        actual: 2,
        done: true
    });
    assert.equal(inProgress.usesCounter, true);
    assert.equal(inProgress.sliderValue, 2);
    assert.equal(inProgress.isDone, false);

    const completed = getBlockCompletionState({
        amount: 5,
        actual: 5,
        done: false
    });
    assert.equal(completed.usesCounter, true);
    assert.equal(completed.isDone, true);

    const toggleOnly = getBlockCompletionState({
        amount: 1,
        actual: 0,
        done: "true"
    });
    assert.equal(toggleOnly.usesCounter, false);
    assert.equal(toggleOnly.isDone, true);
});

test("habit toggling supports today/past and removes value on second toggle", () => {
    const today = "2026-02-11";
    const pastDate = "2026-02-09";
    const futureDate = "2026-02-13";
    const startedAt = "2026-02-01";
    const habitId = "habit-1";

    assert.equal(
        canToggleHabitCell({ readOnly: false, date: today, today, habitStartDate: startedAt, isPlanned: true }),
        true
    );
    assert.equal(
        canToggleHabitCell({ readOnly: false, date: pastDate, today, habitStartDate: startedAt, isPlanned: true }),
        true
    );
    assert.equal(
        canToggleHabitCell({ readOnly: false, date: futureDate, today, habitStartDate: startedAt, isPlanned: true }),
        false
    );
    assert.equal(
        canToggleHabitCell({ readOnly: false, date: today, today, habitStartDate: startedAt, isPlanned: false }),
        false
    );

    const afterFirst = toggleHabitLogEntry({}, today, habitId);
    assert.deepEqual(afterFirst, { [today]: [habitId] });

    const afterSecond = toggleHabitLogEntry(afterFirst, today, habitId);
    assert.deepEqual(afterSecond, {});
});

test("goal week chip class mapping is stable for planned and unplanned weeks", () => {
    assert.equal(getGoalWeekChipClass(undefined), "empty");
    assert.equal(getGoalWeekChipClass({ done: 0, target: 10 }), "zero");
    assert.equal(getGoalWeekChipClass({ done: 3, target: 10 }), "low");
    assert.equal(getGoalWeekChipClass({ done: 5, target: 10 }), "mid");
    assert.equal(getGoalWeekChipClass({ done: 8, target: 10 }), "high");
});

test("habit cell visual state maps to done/missed/inactive", () => {
    assert.equal(getHabitCellVisualState({ isDone: true, isPlanned: true }), "done");
    assert.equal(getHabitCellVisualState({ isDone: false, isPlanned: true }), "missed");
    assert.equal(getHabitCellVisualState({ isDone: false, isPlanned: false }), "inactive");
});

test("expanded habit window is clipped to 28 days and never includes future dates", () => {
    const today = "2026-02-11";
    const windowData = getExpandedHabitDateWindow({
        today,
        habitStartDate: "2025-01-01",
        windowDays: 28
    });

    assert.equal(windowData.startDate, "2026-01-15");
    assert.equal(windowData.endDate, today);
    assert.equal(windowData.dates.length, 28);
    assert.equal(windowData.dates[windowData.dates.length - 1], today);
    assert.equal(windowData.dates.every((date) => date <= today), true);

    const [y, m, d] = windowData.startDate.split("-").map(Number);
    const expectedOffset = (new Date(y ?? 0, (m ?? 1) - 1, d ?? 1).getDay() + 6) % 7;
    assert.equal(windowData.startOffset, expectedOffset);
});

test("expanded habit window starts at habit start when habit is younger than 28 days", () => {
    const today = "2026-02-11";
    const windowData = getExpandedHabitDateWindow({
        today,
        habitStartDate: "2026-02-05",
        windowDays: 28
    });

    assert.equal(windowData.startDate, "2026-02-05");
    assert.equal(windowData.endDate, today);
    assert.equal(windowData.dates.length, 7);
    assert.equal(windowData.dates[0], "2026-02-05");
    assert.equal(windowData.dates[windowData.dates.length - 1], today);
});
