import { PersistedPlannerState, SyncConflictResolution } from "../types";
import { supabaseRestRequest, SupabaseAuthSession } from "./supabaseClient";
import { safeSerialize } from "../persistence/stateSerializer";

export type PlannerStateRecord = {
    userId?: string;
    state: PersistedPlannerState;
    version: number;
    updatedAt: string;
    schemaVersion: number;
};

export type InitialSyncAction = "push_local" | "pull_cloud" | "no_op" | "conflict";

function stableStringify(value: unknown): string {
    if (value === null || value === undefined) return String(value);
    if (typeof value !== "object") return JSON.stringify(value);
    if (Array.isArray(value)) {
        return `[${value.map((item) => stableStringify(item === undefined ? null : item)).join(",")}]`;
    }

    const entries = Object.entries(value as Record<string, unknown>)
        .filter(([, item]) => item !== undefined)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`);
    return `{${entries.join(",")}}`;
}

export function areStatesEquivalent(local: PersistedPlannerState, cloud: PersistedPlannerState): boolean {
    return stableStringify(local) === stableStringify(cloud);
}

export function resolveInitialSyncAction(input: {
    local: PersistedPlannerState;
    cloud: PlannerStateRecord | null;
    localUpdatedAt?: string | null;
}): InitialSyncAction {
    const { local, cloud, localUpdatedAt } = input;
    const localHasData = hasStateData(local);
    const cloudHasData = !!cloud && hasStateData(cloud.state);

    if (!localHasData && !cloudHasData) return "no_op";
    if (localHasData && !cloudHasData) return "push_local";
    if (!localHasData && cloudHasData) return "pull_cloud";

    if (!cloud) return "push_local";
    if (areStatesEquivalent(local, cloud.state)) return "no_op";

    const localMs = localUpdatedAt ? Date.parse(localUpdatedAt) : Number.NaN;
    const cloudMs = Date.parse(cloud.updatedAt);
    if (Number.isFinite(localMs) && Number.isFinite(cloudMs)) {
        const deltaMs = localMs - cloudMs;
        if (deltaMs > 1000) return "push_local";
        if (deltaMs < -1000) return "pull_cloud";
    } else if (Number.isFinite(localMs)) {
        return "push_local";
    } else if (Number.isFinite(cloudMs)) {
        return "pull_cloud";
    }

    return "conflict";
}

export function resolveConflictState(input: {
    local: PersistedPlannerState;
    cloud: PlannerStateRecord;
    resolution: SyncConflictResolution;
}): PersistedPlannerState {
    if (input.resolution === "keep_cloud") return input.cloud.state;
    return input.local;
}

export function hasStateData(state: PersistedPlannerState): boolean {
    return Boolean(
        state.cycle ||
        state.templates.length > 0 ||
        state.history.length > 0 ||
        state.habits.length > 0 ||
        Object.keys(state.habitLog).length > 0
    );
}

type PlannerStateRow = {
    user_id: string;
    state_json: PersistedPlannerState;
    version: number;
    updated_at: string;
    schema_version: number;
};

const STATE_SCHEMA_VERSION = 1;

function normalizeRow(row: PlannerStateRow): PlannerStateRecord {
    return {
        userId: row.user_id,
        state: row.state_json,
        version: row.version,
        updatedAt: row.updated_at,
        schemaVersion: row.schema_version
    };
}

export async function fetchCloudPlannerState(
    session: SupabaseAuthSession
): Promise<{ record: PlannerStateRecord | null; error: string | null }> {
    const userId = encodeURIComponent(session.user.id);
    const result = await supabaseRestRequest<PlannerStateRow[]>(
        `/rest/v1/planner_state?select=user_id,state_json,version,updated_at,schema_version&user_id=eq.${userId}&limit=1`,
        {
            method: "GET"
        },
        session
    );
    if (result.error) {
        return { record: null, error: result.error };
    }
    const row = result.data?.[0];
    return { record: row ? normalizeRow(row) : null, error: null };
}

export async function pushPlannerStateToCloud(input: {
    session: SupabaseAuthSession;
    state: PersistedPlannerState;
    previousVersion?: number;
}): Promise<{ record: PlannerStateRecord | null; error: string | null }> {
    const nextVersion = Math.max(1, Math.floor((input.previousVersion ?? 0) + 1));
    const payload: PlannerStateRow = {
        user_id: input.session.user.id,
        state_json: input.state,
        version: nextVersion,
        updated_at: new Date().toISOString(),
        schema_version: STATE_SCHEMA_VERSION
    };

    const result = await supabaseRestRequest<PlannerStateRow[]>(
        "/rest/v1/planner_state?on_conflict=user_id",
        {
            method: "POST",
            headers: {
                Prefer: "resolution=merge-duplicates,return=representation"
            },
            body: JSON.stringify([payload])
        },
        input.session
    );
    if (result.error) {
        return { record: null, error: result.error };
    }
    const row = result.data?.[0];
    if (!row) {
        return { record: null, error: "Cloud save returned no data." };
    }
    return { record: normalizeRow(row), error: null };
}

export type SyncPlannerResult = {
    ok: boolean;
    action: "pushed" | "pulled" | "noop" | "conflict";
    record: PlannerStateRecord | null;
    pulledState: PersistedPlannerState | null;
    error: string | null;
};

export async function syncPlannerState(input: {
    session: SupabaseAuthSession;
    state: PersistedPlannerState;
    localUpdatedAt?: string | null;
}): Promise<SyncPlannerResult> {
    const cloud = await fetchCloudPlannerState(input.session);
    if (cloud.error) {
        return {
            ok: false,
            action: "noop",
            record: null,
            pulledState: null,
            error: cloud.error
        };
    }

    const decision = resolveInitialSyncAction({
        local: input.state,
        cloud: cloud.record,
        localUpdatedAt: input.localUpdatedAt
    });
    if (decision === "push_local") {
        const pushed = await pushPlannerStateToCloud({
            session: input.session,
            state: input.state,
            previousVersion: cloud.record?.version
        });
        return {
            ok: !pushed.error,
            action: "pushed",
            record: pushed.record,
            pulledState: null,
            error: pushed.error
        };
    }
    if (decision === "pull_cloud" && cloud.record) {
        return {
            ok: true,
            action: "pulled",
            record: cloud.record,
            pulledState: cloud.record.state,
            error: null
        };
    }
    if (decision === "conflict") {
        const localSerialized = safeSerialize(input.state);
        const cloudSerialized = cloud.record ? safeSerialize(cloud.record.state) : { ok: true as const, json: "" };
        if (
            cloud.record &&
            areStatesEquivalent(input.state, cloud.record.state)
        ) {
            return {
                ok: true,
                action: "noop",
                record: cloud.record,
                pulledState: null,
                error: null
            };
        }
        if (!localSerialized.ok || !cloudSerialized.ok) {
            const serializationError = !localSerialized.ok
                ? localSerialized.error.message
                : !cloudSerialized.ok
                    ? cloudSerialized.error.message
                    : "Serialization failed.";
            return {
                ok: false,
                action: "noop",
                record: cloud.record,
                pulledState: null,
                error: serializationError
            };
        }
        return {
            ok: true,
            action: "conflict",
            record: cloud.record,
            pulledState: null,
            error: null
        };
    }

    return {
        ok: true,
        action: "noop",
        record: cloud.record,
        pulledState: null,
        error: null
    };
}
