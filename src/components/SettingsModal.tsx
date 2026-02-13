import {
    AppLanguage,
    Cycle,
    DailyTemplate,
    DateFormat,
    Habit,
    Id,
    LocalSnapshotMeta,
    SyncConflictResolution,
    SyncStatus,
    TimeFormat
} from "../types";
import { t as tr } from "../i18n";
import { GoogleCalendar } from "../googleCalendar";
import { SettingsAppearanceSection } from "./settings/SettingsAppearanceSection";
import { SettingsFormatSection } from "./settings/SettingsFormatSection";
import { SettingsSyncSection } from "./settings/SettingsSyncSection";
import { SettingsImportExportSection } from "./settings/SettingsImportExportSection";
import { SettingsNotificationsSection } from "./settings/SettingsNotificationsSection";

export interface SettingsModalProps {
    activeCycle: Cycle | null;
    readOnly: boolean;
    templates: DailyTemplate[];
    history: Cycle[];
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
    setTemplates: (val: DailyTemplate[]) => void;
    setHistory: (updater: (prev: Cycle[]) => Cycle[]) => void;
    setShowSettings: (val: boolean) => void;
    setViewingArchiveId: (id: Id | null) => void;
    // Dispatch
    dispatch: (action: { type: 'SET'; payload: Cycle | null }) => void;
    // Handlers
    handleRequestNotifications: () => void;

    // Global Habits
    habits: Habit[];
    setHabits: (habits: Habit[]) => void;
    habitLog: Record<string, string[]>;
    setHabitLog: (log: Record<string, string[]>) => void;
    snapshotMetas: LocalSnapshotMeta[];
    syncEnabled: boolean;
    syncStatus: SyncStatus;
    isAuthenticated: boolean;
    authLoading: boolean;
    authError: string | null;
    authMessage: string | null;
    cloudEmail: string | null;
    syncError: string | null;
    pendingConflict: boolean;
    onSignOut: () => Promise<void>;
    onSyncNow: () => Promise<boolean>;
    onResolveSyncConflict: (resolution: SyncConflictResolution) => Promise<boolean>;
}

export function SettingsModal({
    activeCycle,
    readOnly,
    templates,
    history,
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
    setTemplates,
    setHistory,
    setShowSettings,
    setViewingArchiveId,
    dispatch,
    handleRequestNotifications,
    habits,
    setHabits,
    habitLog,
    setHabitLog,
    snapshotMetas,
    syncEnabled,
    syncStatus,
    isAuthenticated,
    authLoading,
    authError,
    authMessage,
    cloudEmail,
    syncError,
    pendingConflict,
    onSignOut,
    onSyncNow,
    onResolveSyncConflict
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

                <SettingsImportExportSection
                    activeCycle={activeCycle}
                    templates={templates}
                    history={history}
                    habits={habits}
                    habitLog={habitLog}
                    darkMode={darkMode}
                    language={language}
                    dateFormat={dateFormat}
                    timeFormat={timeFormat}
                    selectedCalendarId={selectedCalendarId}
                    readOnly={readOnly}
                    googleLoading={googleLoading}
                    googleConnected={googleConnected}
                    calendarList={calendarList}
                    snapshotMetas={snapshotMetas}
                    setGoogleConnected={setGoogleConnected}
                    setCalendarList={setCalendarList}
                    setSelectedCalendarId={setSelectedCalendarId}
                    setTemplates={setTemplates}
                    setHistory={setHistory}
                    setHabits={setHabits}
                    setHabitLog={setHabitLog}
                    setDarkMode={setDarkMode}
                    setLanguage={setLanguage}
                    setDateFormat={setDateFormat}
                    setTimeFormat={setTimeFormat}
                    setViewingArchiveId={setViewingArchiveId}
                    setShowSettings={setShowSettings}
                    dispatch={dispatch}
                />

                <SettingsSyncSection
                    language={language}
                    syncEnabled={syncEnabled}
                    syncStatus={syncStatus}
                    isAuthenticated={isAuthenticated}
                    authLoading={authLoading}
                    cloudEmail={cloudEmail}
                    pendingConflict={pendingConflict}
                    authError={authError}
                    syncError={syncError}
                    authMessage={authMessage}
                    onSignOut={onSignOut}
                    onSyncNow={onSyncNow}
                    onResolveSyncConflict={onResolveSyncConflict}
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
