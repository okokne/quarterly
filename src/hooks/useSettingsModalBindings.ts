import { SettingsModalProps } from "../components/SettingsModal";

type SettingsModalBindingInput = {
    core: Pick<
        SettingsModalProps,
        "activeCycle" |
        "readOnly" |
        "templates" |
        "history" |
        "darkMode" |
        "language" |
        "dateFormat" |
        "timeFormat"
    >;
    google: Pick<
        SettingsModalProps,
        "googleLoading" |
        "googleConnected" |
        "calendarList" |
        "selectedCalendarId"
    >;
    setters: Pick<
        SettingsModalProps,
        "setDarkMode" |
        "setLanguage" |
        "setDateFormat" |
        "setTimeFormat" |
        "setGoogleConnected" |
        "setCalendarList" |
        "setSelectedCalendarId" |
        "setTemplates" |
        "setHistory" |
        "setShowSettings" |
        "setViewingArchiveId"
    >;
    actions: Pick<
        SettingsModalProps,
        "dispatch" |
        "handleRequestNotifications"
    >;
    habits: Pick<
        SettingsModalProps,
        "habits" |
        "setHabits" |
        "habitLog" |
        "setHabitLog"
    >;
    persistence: Pick<
        SettingsModalProps,
        "snapshotMetas"
    >;
    sync: Pick<
        SettingsModalProps,
        "syncEnabled" |
        "syncStatus" |
        "isAuthenticated" |
        "authLoading" |
        "authError" |
        "authMessage" |
        "cloudEmail" |
        "syncError" |
        "pendingConflict" |
        "onSignOut" |
        "onSyncNow" |
        "onResolveSyncConflict"
    >;
};

export function useSettingsModalBindings(input: SettingsModalBindingInput): SettingsModalProps {
    return {
        ...input.core,
        ...input.google,
        ...input.setters,
        ...input.actions,
        ...input.habits,
        ...input.persistence,
        ...input.sync
    };
}
