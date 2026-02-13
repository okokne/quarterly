import { useCallback, useEffect, useMemo, useState } from "react";
import { StorageScope } from "../types";
import {
    getActiveStorageScope,
    migrateLegacyPlannerKeysToGuestScope,
    setActiveStorageScope
} from "../persistence/storageScope";

export function useAppStorageScope() {
    const initialStorageScope = useMemo<StorageScope>(() => {
        migrateLegacyPlannerKeysToGuestScope();
        return getActiveStorageScope();
    }, []);

    const [storageScope, setStorageScope] = useState<StorageScope>(initialStorageScope);
    const handleStorageScopeChange = useCallback((nextScope: StorageScope) => {
        const normalized = setActiveStorageScope(nextScope);
        setStorageScope(normalized);
    }, []);

    useEffect(() => {
        setActiveStorageScope(storageScope);
    }, [storageScope]);

    return {
        initialStorageScope,
        storageScope,
        handleStorageScopeChange
    };
}
