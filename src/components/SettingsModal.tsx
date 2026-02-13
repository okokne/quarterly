import {
    AppLanguage,
    Cycle,
    DateFormat,
    Id,
    SyncStatus,
    TimeFormat
} from "../types";
import { t as tr } from "../i18n";
import { GoogleCalendar } from "../googleCalendar";
import { SettingsAppearanceSection } from "./settings/SettingsAppearanceSection";
import { SettingsFormatSection } from "./settings/SettingsFormatSection";
import { SettingsSyncSection } from "./settings/SettingsSyncSection";
import { SettingsGoogleCalendarSection } from "./settings/SettingsGoogleCalendarSection";
import { SettingsNotificationsSection } from "./settings/SettingsNotificationsSection";

export interface SettingsModalProps {
    activeCycle: Cycle | null;
    readOnly: boolean;
    darkMode: boolean;
    language: AppLanguage;
    dateFormat: DateFormat;
    timeFormat: TimeFormat;
    googleLoading: boolean;
    googleConnected: boolean;
    calendarList: GoogleCalendar[];
    selectedCalendarId: string;
    // Setters
    setDarkMode: (val: boolean) => void;
    setLanguage: (val: AppLanguage) => void;
    setDateFormat: (val: DateFormat) => void;
    setTimeFormat: (val: TimeFormat) => void;
    setGoogleConnected: (val: boolean) => void;
    setCalendarList: (val: GoogleCalendar[]) => void;
    setSelectedCalendarId: (val: string) => void;
    setShowSettings: (val: boolean) => void;
    setViewingArchiveId: (id: Id | null) => void;
    // Handlers
    handleRequestNotifications: () => void;
    syncEnabled: boolean;
    syncStatus: SyncStatus;
    isAuthenticated: boolean;
    authLoading: boolean;
    authError: string | null;
    authMessage: string | null;
    cloudEmail: string | null;
    syncError: string | null;
    isOnline: boolean;
    pendingLocalChangesCount: number;
    lastSyncedAt: string | null;
    onDownloadMyData: () => void;
    onSignOut: () => Promise<void>;
    onDeleteAccount: () => Promise<boolean>;
    onSyncNow: () => Promise<boolean>;
}

export function SettingsModal({
    activeCycle,
    readOnly,
    darkMode,
    language,
    dateFormat,
    timeFormat,
    googleLoading,
    googleConnected,
    calendarList,
    selectedCalendarId,
    setDarkMode,
    setLanguage,
    setDateFormat,
    setTimeFormat,
    setGoogleConnected,
    setCalendarList,
    setSelectedCalendarId,
    setShowSettings,
    setViewingArchiveId,
    handleRequestNotifications,
    syncEnabled,
    syncStatus,
    isAuthenticated,
    authLoading,
    authError,
    authMessage,
    cloudEmail,
    syncError,
    isOnline,
    pendingLocalChangesCount,
    lastSyncedAt,
    onDownloadMyData,
    onSignOut,
    onDeleteAccount,
    onSyncNow
}: SettingsModalProps) {
    return (
        <div className="settings-overlay" onClick={() => setShowSettings(false)}>
            <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
                <div className="settings-header">
                    <h2>{tr(language, "settings.title")}</h2>
                    <button className="settings-close" onClick={() => setShowSettings(false)}>×</button>
                </div>

                <SettingsAppearanceSection
                    language={language}
                    darkMode={darkMode}
                    setDarkMode={setDarkMode}
                />

                <SettingsFormatSection
                    language={language}
                    dateFormat={dateFormat}
                    timeFormat={timeFormat}
                    setLanguage={setLanguage}
                    setDateFormat={setDateFormat}
                    setTimeFormat={setTimeFormat}
                />

                <div className="settings-section">
                    <h3>{tr(language, "settings.integrationsTitle")}</h3>
                    <SettingsGoogleCalendarSection
                        language={language}
                        readOnly={readOnly}
                        googleLoading={googleLoading}
                        googleConnected={googleConnected}
                        calendarList={calendarList}
                        selectedCalendarId={selectedCalendarId}
                        setGoogleConnected={setGoogleConnected}
                        setCalendarList={setCalendarList}
                        setSelectedCalendarId={setSelectedCalendarId}
                    />
                </div>

                <SettingsSyncSection
                    language={language}
                    syncEnabled={syncEnabled}
                    syncStatus={syncStatus}
                    isAuthenticated={isAuthenticated}
                    authLoading={authLoading}
                    cloudEmail={cloudEmail}
                    authError={authError}
                    syncError={syncError}
                    authMessage={authMessage}
                    isOnline={isOnline}
                    pendingLocalChangesCount={pendingLocalChangesCount}
                    lastSyncedAt={lastSyncedAt}
                    onDownloadMyData={onDownloadMyData}
                    onSignOut={onSignOut}
                    onDeleteAccount={onDeleteAccount}
                    onSyncNow={onSyncNow}
                />

                <SettingsNotificationsSection
                    language={language}
                    readOnly={readOnly}
                    onRequestNotifications={handleRequestNotifications}
                />
                <div className="settings-section">
                    <h3>{tr(language, "cycle.drawerTitle")}</h3>
                    <p className="muted">{tr(language, "settings.cycleDrawerHint")}</p>
                </div>
                <div className="settings-section">
                    <h3>{tr(language, "common.habits")}</h3>
                    <p className="muted">{tr(language, "settings.habitsInAppHint")}</p>
                </div>
            </div>
        </div>
    );
}
