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
import { SettingsJournalContextsSection } from "./settings/SettingsJournalContextsSection";

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
    updateCycle: ((updater: (prev: Cycle) => Cycle) => void) | null;
    settingsContextFocusId: string | null;
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
    onLoadDemoData: () => Promise<void> | void;
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
    onChangePassword: (newPassword: string) => Promise<boolean>;
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
    updateCycle,
    settingsContextFocusId,
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
    onLoadDemoData,
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
    onChangePassword,
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
                    <h3>{tr(language, "common.importExport")}</h3>
                    <div className="settings-row">
                        <label>{tr(language, "settings.demoData")}</label>
                        <button
                            type="button"
                            className="button accent"
                            disabled={readOnly}
                            onClick={() => {
                                void onLoadDemoData();
                            }}
                        >
                            {tr(language, "settings.loadDemoData")}
                        </button>
                    </div>
                </div>

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
                    onChangePassword={onChangePassword}
                    onSyncNow={onSyncNow}
                />

                <SettingsNotificationsSection
                    language={language}
                    readOnly={readOnly}
                    onRequestNotifications={handleRequestNotifications}
                />

                {activeCycle && updateCycle && (
                    <SettingsJournalContextsSection
                        cycle={activeCycle}
                        language={language}
                        readOnly={readOnly}
                        updateCycle={updateCycle}
                        focusedContextId={settingsContextFocusId}
                    />
                )}

            </div>
        </div>
    );
}
