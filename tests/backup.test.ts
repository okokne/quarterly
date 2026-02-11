import test from "node:test";
import assert from "node:assert/strict";
import { parseBackupPayload } from "../src/backup";
import { buildCycle } from "../src/utils";

test("parseBackupPayload normalizes cycle blocks and deduplicates habit log", () => {
    const startDate = "2026-02-02";
    const baseCycle = buildCycle("Test Cycle", startDate);

    const payload = {
        cycle: {
            ...baseCycle,
            dailyPlans: {
                [startDate]: [
                    {
                        id: "b1",
                        startTime: "09:00",
                        endTime: "10:00",
                        title: "Focus Sprint",
                        done: "false",
                        amount: "5",
                        actual: "2"
                    },
                    {
                        id: "b2",
                        startTime: "10:00",
                        endTime: "11:00",
                        title: "Calls",
                        done: "true",
                        amount: 3,
                        actual: 3
                    }
                ]
            }
        },
        habits: [
            {
                id: "h1",
                title: "Morning Routine",
                emoji: "🌅",
                frequency: "daily",
                activeFrom: 1,
                activeTo: 12,
                startedAt: startDate,
                createdAt: startDate,
                goal: { type: "target", target: 30, unit: "days" }
            }
        ],
        habitLog: {
            [startDate]: ["h1", "h1"]
        },
        preferences: {
            darkMode: false,
            language: "en",
            dateFormat: "eu_short",
            timeFormat: "24h",
            selectedCalendarId: "primary"
        }
    };

    const parsed = parseBackupPayload(payload);
    const parsedCycle = parsed.cycle;
    assert.ok(parsedCycle, "cycle should be present");
    if (!parsedCycle) {
        throw new Error("Expected parsed cycle to be present");
    }
    const blocks = parsedCycle.dailyPlans[startDate] ?? [];
    assert.equal(blocks.length, 2);
    assert.equal(blocks[0]?.done, false);
    assert.equal(blocks[0]?.amount, 5);
    assert.equal(blocks[0]?.actual, 2);
    assert.equal(blocks[1]?.done, true);
    assert.deepEqual(parsed.habitLog?.[startDate], ["h1"]);
});

test("parseBackupPayload rejects payloads without known backup keys", () => {
    assert.throws(
        () => parseBackupPayload({ foo: "bar" }),
        /no known keys/i
    );
});
