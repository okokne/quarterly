import { Dispatch, SetStateAction, useCallback, useEffect, useMemo } from "react";
import {
    AppLanguage,
    Cycle,
    DateFormat,
    DailyTemplate,
    Habit,
    Id,
    PersistedPlannerState,
    StorageScope,
    TimeFormat,
    Book
} from "../types";
import { buildPersistedPlannerState } from "../persistence/stateSerializer";
import { usePlannerSync } from "./usePlannerSync";
import { usePlannerPersistence } from "./usePlannerPersistence";
import { debugSync } from "../sync/syncDebug";

type UseAppSyncPersistenceParams = {
    activeCycle: Cycle | null;
    templates: DailyTemplate[];
    history: Cycle[];
    habits: Habit[];
    habitLog: Record<string, string[]>;
    darkMode: boolean;
    language: AppLanguage;
    dateFormat: DateFormat;
    timeFormat: TimeFormat;
    selectedCalendarId: string;
    dispatch: Dispatch<{ type: "SET"; payload: Cycle | null }>;
    setTemplates: Dispatch<SetStateAction<DailyTemplate[]>>;
    setHistory: Dispatch<SetStateAction<Cycle[]>>;
    setHabits: Dispatch<SetStateAction<Habit[]>>;
    setHabitLog: Dispatch<SetStateAction<Record<string, string[]>>>;
    books: Book[];
    setBooks: Dispatch<SetStateAction<Book[]>>;
    setDarkMode: (val: boolean) => void;
    setLanguage: (val: AppLanguage) => void;
    setDateFormat: (val: DateFormat) => void;
    setTimeFormat: (val: TimeFormat) => void;
    setSelectedCalendarId: (val: string) => void;
    setViewingArchiveId: (id: Id | null) => void;
    storageScope: StorageScope;
    onStorageScopeChange: (scope: StorageScope) => void;
    hasCycle: boolean;
};

export function useAppSyncPersistence({
    activeCycle,
    templates,
    history,
    habits,
    habitLog,
    darkMode,
    language,
    dateFormat,
    timeFormat,
    selectedCalendarId,
    dispatch,
    setTemplates,
    setHistory,
    setHabits,
    setHabitLog,
    books,
    setBooks,
    setDarkMode,
    setLanguage,
    setDateFormat,
    setTimeFormat,
    setSelectedCalendarId,
    setViewingArchiveId,
    storageScope,
    onStorageScopeChange,
    hasCycle
}: UseAppSyncPersistenceParams) {
    const persistedPlannerState = useMemo(() => buildPersistedPlannerState({
        cycle: activeCycle,
        templates,
        history,
        habits,
        habitLog,
        books,
        preferences: {
            darkMode,
            language,
            dateFormat,
            timeFormat,
            selectedCalendarId
        }
    }), [
        activeCycle,
        templates,
        history,
        habits,
        habitLog,
        books,
        darkMode,
        language,
        dateFormat,
        timeFormat,
        selectedCalendarId
    ]);

    const applyPersistedState = useCallback((nextState: PersistedPlannerState) => {
        dispatch({ type: "SET", payload: nextState.cycle });
        setTemplates(nextState.templates);
        setHistory(() => nextState.history);
        setHabits(nextState.habits);
        setHabitLog(nextState.habitLog);
        setBooks(nextState.books);
        setDarkMode(nextState.preferences.darkMode);
        setLanguage(nextState.preferences.language);
        setDateFormat(nextState.preferences.dateFormat);
        setTimeFormat(nextState.preferences.timeFormat);
        setSelectedCalendarId(nextState.preferences.selectedCalendarId || "primary");
        setViewingArchiveId(null);
    }, [
        dispatch,
        setTemplates,
        setHistory,
        setHabits,
        setHabitLog,
        setBooks,
        setDarkMode,
        setLanguage,
        setDateFormat,
        setTimeFormat,
        setSelectedCalendarId,
        setViewingArchiveId
    ]);

    const {
        syncEnabled,
        syncStatus,
        bootstrapStatus,
        activeScope,
        lastBootstrapSource,
        isAuthenticated,
        authLoading,
        authError,
        authMessage,
        magicLinkRedirectUrl,
        magicLinkRedirectError,
        cloudEmail,
        syncError,
        pendingConflict,
        pendingLocalChangesCount,
        lastSyncedAt,
        isOnline,
        signUp,
        signIn,
        checkEmailAccount,
        requestOneTimeCode,
        verifyOneTimeCode,
        requestMagicLink,
        signOut,
        deleteAccount,
        changePassword,
        requestSyncNow,
        resolveSyncConflict
    } = usePlannerSync({
        state: persistedPlannerState,
        onApplyRemoteState: applyPersistedState,
        storageScope,
        onStorageScopeChange
    });

    const {
        snapshotMetas,
        recoveryCandidate,
        persistenceWarning,
        clearPersistenceWarning,
        dismissRecovery,
        restoreLatestSnapshot
    } = usePlannerPersistence({
        state: persistedPlannerState,
        applyState: applyPersistedState,
        storageScope,
        suspendWrites: bootstrapStatus === "restoring"
    });

    useEffect(() => {
        debugSync("plans_screen_render", {
            source: lastBootstrapSource,
            scope: activeScope,
            count: hasCycle ? 1 : 0
        });
    }, [activeScope, hasCycle, lastBootstrapSource]);

    const awaitingCloudDashboard = syncEnabled && isAuthenticated && bootstrapStatus !== "ready";

    return {
        persistedPlannerState,
        syncEnabled,
        syncStatus,
        bootstrapStatus,
        activeScope,
        lastBootstrapSource,
        isAuthenticated,
        authLoading,
        authError,
        authMessage,
        magicLinkRedirectUrl,
        magicLinkRedirectError,
        cloudEmail,
        syncError,
        pendingConflict,
        pendingLocalChangesCount,
        lastSyncedAt,
        isOnline,
        signUp,
        signIn,
        checkEmailAccount,
        requestOneTimeCode,
        verifyOneTimeCode,
        requestMagicLink,
        signOut,
        deleteAccount,
        changePassword,
        requestSyncNow,
        resolveSyncConflict,
        snapshotMetas,
        recoveryCandidate,
        persistenceWarning,
        clearPersistenceWarning,
        dismissRecovery,
        restoreLatestSnapshot,
        awaitingCloudDashboard
    };
}
