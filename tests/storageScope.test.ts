import test from "node:test";
import assert from "node:assert/strict";
import { STORAGE_KEY } from "../src/types";
import {
    getScopedStorageKey,
    migrateLegacyPlannerKeysToGuestScope,
    readScopedStorageValue,
    writeScopedStorageValue
} from "../src/persistence/storageScope";
import { installMockStorage } from "./testStorageMock";

test("scoped keys separate guest and users", () => {
    const { restore } = installMockStorage();
    try {
        writeScopedStorageValue(STORAGE_KEY, "guest", "guest-data");
        writeScopedStorageValue(STORAGE_KEY, "user-a", "user-a-data");
        writeScopedStorageValue(STORAGE_KEY, "user-b", "user-b-data");

        assert.equal(readScopedStorageValue(STORAGE_KEY, "guest"), "guest-data");
        assert.equal(readScopedStorageValue(STORAGE_KEY, "user-a"), "user-a-data");
        assert.equal(readScopedStorageValue(STORAGE_KEY, "user-b"), "user-b-data");
        assert.notEqual(
            getScopedStorageKey(STORAGE_KEY, "user-a"),
            getScopedStorageKey(STORAGE_KEY, "user-b")
        );
    } finally {
        restore();
    }
});

test("legacy migration copies old global planner keys into guest scope only", () => {
    const { storage, restore } = installMockStorage();
    try {
        storage.setItem(STORAGE_KEY, "legacy-cycle");
        migrateLegacyPlannerKeysToGuestScope();

        assert.equal(readScopedStorageValue(STORAGE_KEY, "guest"), "legacy-cycle");
        assert.equal(readScopedStorageValue(STORAGE_KEY, "user-c"), null);
    } finally {
        restore();
    }
});

test("scope reads do not leak across users", () => {
    const { restore } = installMockStorage();
    try {
        writeScopedStorageValue(STORAGE_KEY, "user-1", "one");
        assert.equal(readScopedStorageValue(STORAGE_KEY, "user-2"), null);
        assert.equal(readScopedStorageValue(STORAGE_KEY, "guest"), null);
    } finally {
        restore();
    }
});
