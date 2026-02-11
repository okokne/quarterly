import test from "node:test";
import assert from "node:assert/strict";
import { buildCycle } from "../src/utils";
import { buildSnapshotRecord, rotateSnapshots } from "../src/persistence/localSnapshots";
import { mergeImportedPlannerState, safeSerialize } from "../src/persistence/stateSerializer";
import { PersistedPlannerState } from "../src/types";

function makeState(): PersistedPlannerState {
    const cycle = buildCycle("Cycle", "2026-02-02");
    return {
        cycle,
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

test("rotateSnapshots keeps only latest 30 snapshots", () => {
    const base = makeState();
    const snapshots = Array.from({ length: 35 }, (_, i) =>
        buildSnapshotRecord(base, `2026-02-${String((i % 28) + 1).padStart(2, "0")}T10:00:${String(i).padStart(2, "0")}.000Z`)
    );

    const rotated = rotateSnapshots(snapshots, 30);
    assert.equal(rotated.length, 30);
    assert.equal(rotated[0]?.createdAt, snapshots[5]?.createdAt);
    assert.equal(rotated[29]?.createdAt, snapshots[34]?.createdAt);
});

test("safeSerialize returns error for circular input", () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;

    const result = safeSerialize(circular);
    assert.equal(result.ok, false);
    if (!result.ok) {
        assert.match(result.error.message.toLowerCase(), /circular|cyclic/);
    }
});

test("mergeImportedPlannerState replaces sections in replace mode", () => {
    const current = makeState();
    const incomingCycle = buildCycle("Imported", "2026-03-01");

    const merged = mergeImportedPlannerState({
        current,
        incoming: {
            cycle: incomingCycle,
            templates: [{ id: "t1", name: "Focus", blocks: [] }]
        },
        mode: "replace"
    });

    assert.equal(merged.cycle?.id, incomingCycle.id);
    assert.equal(merged.templates.length, 1);
});

test("mergeImportedPlannerState only fills missing sections in merge_missing mode", () => {
    const current = makeState();
    const incomingCycle = buildCycle("Imported", "2026-03-01");

    const merged = mergeImportedPlannerState({
        current,
        incoming: {
            cycle: incomingCycle,
            templates: [{ id: "t1", name: "Focus", blocks: [] }]
        },
        mode: "merge_missing"
    });

    assert.equal(merged.cycle?.id, current.cycle?.id);
    assert.equal(merged.templates.length, 1);
});
