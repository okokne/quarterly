import { PersistedPlannerState, SyncSource } from "../types";
import { hasMeaningfulPlannerData } from "../persistence/stateSerializer";
import { PlannerStateRecord, fetchCloudPlannerState, hasStateData, pushPlannerStateToCloud } from "./plannerSync";
import { SupabaseAuthSession } from "./supabaseClient";

export type BootstrapDecision = "use_cloud" | "push_local_scoped" | "empty";

export type BootstrapResult = {
    ok: boolean;
    decision: BootstrapDecision;
    source: SyncSource;
    record: PlannerStateRecord | null;
    state: PersistedPlannerState | null;
    error: string | null;
};

export function decideBootstrapSource(input: {
    cloudRecord: PlannerStateRecord | null;
    localScopedState: PersistedPlannerState;
}): BootstrapDecision {
    const cloudHasData = !!input.cloudRecord && hasStateData(input.cloudRecord.state);
    const localHasData = hasMeaningfulPlannerData(input.localScopedState);
    if (cloudHasData) return "use_cloud";
    if (localHasData) return "push_local_scoped";
    return "empty";
}

export async function bootstrapAfterLogin(input: {
    session: SupabaseAuthSession;
    localScopedState: PersistedPlannerState;
    fetchCloudState?: typeof fetchCloudPlannerState;
    pushCloudState?: typeof pushPlannerStateToCloud;
}): Promise<BootstrapResult> {
    const fetchCloudState = input.fetchCloudState ?? fetchCloudPlannerState;
    const pushCloudState = input.pushCloudState ?? pushPlannerStateToCloud;
    const cloud = await fetchCloudState(input.session);
    if (cloud.error) {
        return {
            ok: false,
            decision: "empty",
            source: "none",
            record: null,
            state: null,
            error: cloud.error
        };
    }

    const decision = decideBootstrapSource({
        cloudRecord: cloud.record,
        localScopedState: input.localScopedState
    });

    if (decision === "use_cloud" && cloud.record) {
        return {
            ok: true,
            decision,
            source: "cloud",
            record: cloud.record,
            state: cloud.record.state,
            error: null
        };
    }

    if (decision === "push_local_scoped") {
        const pushed = await pushCloudState({
            session: input.session,
            state: input.localScopedState,
            previousVersion: cloud.record?.version
        });
        if (pushed.error || !pushed.record) {
            return {
                ok: false,
                decision,
                source: "none",
                record: null,
                state: null,
                error: pushed.error ?? "Initial cloud push failed."
            };
        }
        return {
            ok: true,
            decision,
            source: "local_scoped",
            record: pushed.record,
            state: input.localScopedState,
            error: null
        };
    }

    return {
        ok: true,
        decision,
        source: "none",
        record: cloud.record,
        state: null,
        error: null
    };
}
