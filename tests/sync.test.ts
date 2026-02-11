import test from "node:test";
import assert from "node:assert/strict";
import { buildCycle } from "../src/utils";
import { PersistedPlannerState } from "../src/types";
import { areStatesEquivalent, resolveConflictState, resolveInitialSyncAction } from "../src/sync/plannerSync";

function emptyState(): PersistedPlannerState {
    return {
        cycle: null,
        templates: [],
        history: [],
        habits: [],
        habitLog: {},
        preferences: {
            darkMode: false,
            language: "de",
            dateFormat: "eu_short",
            timeFormat: "24h",
            selectedCalendarId: "primary"
        }
    };
}

test("resolveInitialSyncAction chooses push_local when cloud empty", () => {
    const local = {
        ...emptyState(),
        cycle: buildCycle("Local", "2026-02-02")
    };
    const action = resolveInitialSyncAction({ local, cloud: null });
    assert.equal(action, "push_local");
});

test("resolveInitialSyncAction chooses pull_cloud when local empty", () => {
    const cloudState = {
        ...emptyState(),
        cycle: buildCycle("Cloud", "2026-02-02")
    };
    const action = resolveInitialSyncAction({
        local: emptyState(),
        cloud: {
            state: cloudState,
            version: 1,
            updatedAt: "2026-02-11T10:00:00.000Z",
            schemaVersion: 1
        }
    });
    assert.equal(action, "pull_cloud");
});

test("resolveInitialSyncAction chooses push_local when local write is newer", () => {
    const local = {
        ...emptyState(),
        cycle: buildCycle("Local", "2026-02-02")
    };
    const cloudState = {
        ...emptyState(),
        cycle: buildCycle("Cloud", "2026-02-01")
    };
    const action = resolveInitialSyncAction({
        local,
        cloud: {
            state: cloudState,
            version: 2,
            updatedAt: "2026-02-11T10:00:00.000Z",
            schemaVersion: 1
        },
        localUpdatedAt: "2026-02-11T10:05:00.000Z"
    });
    assert.equal(action, "push_local");
});

test("resolveInitialSyncAction chooses pull_cloud when cloud write is newer", () => {
    const local = {
        ...emptyState(),
        cycle: buildCycle("Local", "2026-02-02")
    };
    const cloudState = {
        ...emptyState(),
        cycle: buildCycle("Cloud", "2026-02-01")
    };
    const action = resolveInitialSyncAction({
        local,
        cloud: {
            state: cloudState,
            version: 2,
            updatedAt: "2026-02-11T10:05:00.000Z",
            schemaVersion: 1
        },
        localUpdatedAt: "2026-02-11T10:00:00.000Z"
    });
    assert.equal(action, "pull_cloud");
});

test("resolveConflictState keeps cloud when requested", () => {
    const local = {
        ...emptyState(),
        cycle: buildCycle("Local", "2026-02-02")
    };
    const cloudState = {
        ...emptyState(),
        cycle: buildCycle("Cloud", "2026-02-03")
    };

    const resolved = resolveConflictState({
        local,
        cloud: {
            state: cloudState,
            version: 2,
            updatedAt: "2026-02-11T10:00:00.000Z",
            schemaVersion: 1
        },
        resolution: "keep_cloud"
    });

    assert.equal(resolved.cycle?.title, "Cloud");
});

test("areStatesEquivalent ignores object key order", () => {
    const base = buildCycle("Local", "2026-02-02");
    const local: PersistedPlannerState = {
        ...emptyState(),
        cycle: base,
        habits: [
            {
                id: "h1",
                title: "Habit",
                emoji: "✅",
                frequency: "daily",
                activeFrom: 1,
                activeTo: 12,
                startedAt: "2026-02-02",
                createdAt: "2026-02-02",
                goal: { type: "open" }
            }
        ],
        habitLog: {
            "2026-02-03": ["h1"],
            "2026-02-02": ["h1"]
        }
    };
    const cloud: PersistedPlannerState = {
        ...emptyState(),
        cycle: base,
        habits: [...local.habits],
        habitLog: {
            "2026-02-02": ["h1"],
            "2026-02-03": ["h1"]
        }
    };

    assert.equal(areStatesEquivalent(local, cloud), true);
});

test("resolveInitialSyncAction returns no_op for semantically equal state", () => {
    const cycle = buildCycle("Local", "2026-02-02");
    const local: PersistedPlannerState = {
        ...emptyState(),
        cycle,
        habitLog: {
            "2026-02-03": ["h1"],
            "2026-02-02": ["h1"]
        }
    };
    const cloudState: PersistedPlannerState = {
        ...emptyState(),
        cycle: JSON.parse(JSON.stringify(cycle)) as PersistedPlannerState["cycle"],
        habitLog: {
            "2026-02-02": ["h1"],
            "2026-02-03": ["h1"]
        }
    };

    const action = resolveInitialSyncAction({
        local,
        cloud: {
            state: cloudState,
            version: 1,
            updatedAt: "2026-02-11T10:00:00.000Z",
            schemaVersion: 1
        }
    });
    assert.equal(action, "no_op");
});
