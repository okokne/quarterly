import test from "node:test";
import assert from "node:assert/strict";
import { clearOfflineDirty, hasOfflineDirtyChanges, markOfflineDirty } from "../src/sync/offlineOutbox";
import { installMockStorage } from "./testStorageMock";

test("offline outbox marks and clears dirty state per scope", () => {
    const { restore } = installMockStorage();
    try {
        assert.equal(hasOfflineDirtyChanges("user-a"), false);
        markOfflineDirty("user-a");
        assert.equal(hasOfflineDirtyChanges("user-a"), true);
        assert.equal(hasOfflineDirtyChanges("user-b"), false);
        clearOfflineDirty("user-a");
        assert.equal(hasOfflineDirtyChanges("user-a"), false);
    } finally {
        restore();
    }
});

test("guest dirty marker is isolated from user scope", () => {
    const { restore } = installMockStorage();
    try {
        markOfflineDirty("guest");
        assert.equal(hasOfflineDirtyChanges("guest"), true);
        assert.equal(hasOfflineDirtyChanges("user-a"), false);
    } finally {
        restore();
    }
});
