import { SettingsModalProps } from "../components/SettingsModal";

type SettingsModalBindingInput = {
    core: Pick<
        SettingsModalProps,
        "activeCycle" |
        "readOnly" |
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
        "setShowSettings" |
        "setViewingArchiveId"
    >;
    actions: Pick<
        SettingsModalProps,
        "handleRequestNotifications"
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
        "isOnline" |
        "pendingLocalChangesCount" |
        "lastSyncedAt" |
        "onDownloadMyData" |
        "onSignOut" |
        "onDeleteAccount" |
        "onSyncNow"
    >;
};

export function useSettingsModalBindings(input: SettingsModalBindingInput): SettingsModalProps {
    return {
        ...input.core,
        ...input.google,
        ...input.setters,
        ...input.actions,
        ...input.sync
    };
}
