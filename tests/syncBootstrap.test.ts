import test from "node:test";
import assert from "node:assert/strict";
import { buildCycle } from "../src/utils";
import { PersistedPlannerState } from "../src/types";
import { bootstrapAfterLogin, decideBootstrapSource } from "../src/sync/bootstrap";

function emptyState(): PersistedPlannerState {
    return {
        cycle: null,
        templates: [],
        history: [],
        habits: [],
        habitLog: {},
        books: [],
        preferences: {
            darkMode: false,
            language: "de",
            dateFormat: "eu_short",
            timeFormat: "24h",
            selectedCalendarId: "primary"
        }
    };
}

const fakeSession = {
    access_token: "header.payload.signature",
    refresh_token: "refresh",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: "bearer",
    user: {
        id: "user-1",
        email: "user@example.com"
    }
};

test("bootstrap prefers cloud data over local scoped data", async () => {
    const localScoped = {
        ...emptyState(),
        cycle: buildCycle("Local", "2026-02-01")
    };
    const cloudState = {
        ...emptyState(),
        cycle: buildCycle("Cloud", "2026-02-03")
    };

    const result = await bootstrapAfterLogin({
        session: fakeSession,
        localScopedState: localScoped,
        fetchCloudState: async () => ({
            error: null,
            record: {
                userId: "user-1",
                state: cloudState,
                version: 2,
                updatedAt: "2026-02-11T10:00:00.000Z",
                schemaVersion: 1
            }
        }),
        pushCloudState: async () => {
            throw new Error("pushCloudState should not be called when cloud has data");
        }
    });

    assert.equal(result.ok, true);
    assert.equal(result.source, "cloud");
    assert.equal(result.state?.cycle?.title, "Cloud");
});

test("bootstrap pushes local scoped data when cloud is empty", async () => {
    const localScoped = {
        ...emptyState(),
        cycle: buildCycle("ScopedLocal", "2026-02-01")
    };

    const result = await bootstrapAfterLogin({
        session: fakeSession,
        localScopedState: localScoped,
        fetchCloudState: async () => ({ error: null, record: null }),
        pushCloudState: async () => ({
            error: null,
            record: {
                userId: "user-1",
                state: localScoped,
                version: 1,
                updatedAt: "2026-02-11T10:00:00.000Z",
                schemaVersion: 1
            }
        })
    });

    assert.equal(result.ok, true);
    assert.equal(result.source, "local_scoped");
    assert.equal(result.state?.cycle?.title, "ScopedLocal");
});

test("bootstrap leaves state empty when cloud and user-scoped local are empty", async () => {
    const result = await bootstrapAfterLogin({
        session: fakeSession,
        localScopedState: emptyState(),
        fetchCloudState: async () => ({ error: null, record: null }),
        pushCloudState: async () => {
            throw new Error("pushCloudState should not be called when local scoped state is empty");
        }
    });

    assert.equal(result.ok, true);
    assert.equal(result.source, "none");
    assert.equal(result.state, null);
});

test("bootstrap decision helper matches cloud-first policy", () => {
    const cloudState = {
        ...emptyState(),
        cycle: buildCycle("Cloud", "2026-02-03")
    };
    const localScoped = {
        ...emptyState(),
        cycle: buildCycle("Local", "2026-02-01")
    };

    const decision = decideBootstrapSource({
        cloudRecord: {
            userId: "user-1",
            state: cloudState,
            version: 2,
            updatedAt: "2026-02-11T10:00:00.000Z",
            schemaVersion: 1
        },
        localScopedState: localScoped
    });
    assert.equal(decision, "use_cloud");
});
