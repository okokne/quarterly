import { useState } from "react";
import {
    AppLanguage,
    Cycle,
    DailyTemplate,
    DateFormat,
    Habit,
    Id,
    LocalSnapshotMeta,
    TimeFormat
} from "../../types";
import { t as tr } from "../../i18n";
import { GoogleCalendar } from "../../googleCalendar";
import { ImportMode } from "../../persistence/stateSerializer";
import { SettingsBackupSection } from "./SettingsBackupSection";
import { SettingsGoogleCalendarSection } from "./SettingsGoogleCalendarSection";

type SettingsImportExportSectionProps = {
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
    readOnly: boolean;
    googleLoading: boolean;
    googleConnected: boolean;
    calendarList: GoogleCalendar[];
    snapshotMetas: LocalSnapshotMeta[];
    setGoogleConnected: (val: boolean) => void;
    setCalendarList: (val: GoogleCalendar[]) => void;
    setSelectedCalendarId: (val: string) => void;
    setTemplates: (val: DailyTemplate[]) => void;
    setHistory: (updater: (prev: Cycle[]) => Cycle[]) => void;
    setHabits: (habits: Habit[]) => void;
    setHabitLog: (log: Record<string, string[]>) => void;
    setDarkMode: (val: boolean) => void;
    setLanguage: (val: AppLanguage) => void;
    setDateFormat: (val: DateFormat) => void;
    setTimeFormat: (val: TimeFormat) => void;
    setViewingArchiveId: (id: Id | null) => void;
    setShowSettings: (val: boolean) => void;
    dispatch: (action: { type: "SET"; payload: Cycle | null }) => void;
};

export function SettingsImportExportSection({
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
    readOnly,
    googleLoading,
    googleConnected,
    calendarList,
    snapshotMetas,
    setGoogleConnected,
    setCalendarList,
    setSelectedCalendarId,
    setTemplates,
    setHistory,
    setHabits,
    setHabitLog,
    setDarkMode,
    setLanguage,
    setDateFormat,
    setTimeFormat,
    setViewingArchiveId,
    setShowSettings,
    dispatch
}: SettingsImportExportSectionProps) {
    const [importMode, setImportMode] = useState<ImportMode>("replace");

    return (
        <div className="settings-section">
            <h3>{tr(language, "common.importExport")}</h3>
            <SettingsBackupSection
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
                snapshotMetas={snapshotMetas}
                importMode={importMode}
                setImportMode={setImportMode}
                setTemplates={setTemplates}
                setHistory={setHistory}
                setHabits={setHabits}
                setHabitLog={setHabitLog}
                setDarkMode={setDarkMode}
                setLanguage={setLanguage}
                setDateFormat={setDateFormat}
                setTimeFormat={setTimeFormat}
                setSelectedCalendarId={setSelectedCalendarId}
                setViewingArchiveId={setViewingArchiveId}
                setShowSettings={setShowSettings}
                dispatch={dispatch}
            />
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
    );
}
