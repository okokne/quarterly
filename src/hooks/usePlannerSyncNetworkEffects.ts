import { useEffect } from "react";
import { SyncStatus } from "../types";

type UsePlannerSyncNetworkEffectsParams = {
    syncFeatureEnabled: boolean;
    setSyncStatus: (status: SyncStatus) => void;
    setOnlineTick: (updater: (prev: number) => number) => void;
};

export function usePlannerSyncNetworkEffects({
    syncFeatureEnabled,
    setSyncStatus,
    setOnlineTick
}: UsePlannerSyncNetworkEffectsParams) {
    useEffect(() => {
        if (!syncFeatureEnabled) return;
        const toOnline = () => {
            setSyncStatus("idle");
            setOnlineTick((prev) => prev + 1);
        };
        const toOffline = () => setSyncStatus("offline");
        window.addEventListener("online", toOnline);
        window.addEventListener("offline", toOffline);
        return () => {
            window.removeEventListener("online", toOnline);
            window.removeEventListener("offline", toOffline);
        };
    }, [setOnlineTick, setSyncStatus, syncFeatureEnabled]);
}
