import {
    AppLanguage,
    Cycle,
    DailyTemplate,
    DateFormat,
    Habit,
    Id,
    LocalSnapshotMeta,
    PersistedPlannerState,
    TimeFormat,
    Book
} from "../../types";
import { Download } from "../ui/icons";
import { t as tr } from "../../i18n";
import { formatDate, toIsoDate } from "../../utils";
import { createBackupSnapshot, parseBackupPayload } from "../../backup";
import { ImportMode, mergeImportedPlannerState, summarizeImportSections } from "../../persistence/stateSerializer";
import { Icon } from "../ui/Icon";

type SettingsBackupSectionProps = {
    activeCycle: Cycle | null;
    templates: DailyTemplate[];
    history: Cycle[];
    habits: Habit[];
    habitLog: Record<string, string[]>;
    books: Book[];
    darkMode: boolean;
    language: AppLanguage;
    dateFormat: DateFormat;
    timeFormat: TimeFormat;
    selectedCalendarId: string;
    readOnly: boolean;
    snapshotMetas: LocalSnapshotMeta[];
    importMode: ImportMode;
    setImportMode: (mode: ImportMode) => void;
    setTemplates: (val: DailyTemplate[]) => void;
    setHistory: (updater: (prev: Cycle[]) => Cycle[]) => void;
    setHabits: (habits: Habit[]) => void;
    setHabitLog: (log: Record<string, string[]>) => void;
    setBooks: (books: Book[]) => void;
    setDarkMode: (val: boolean) => void;
    setLanguage: (val: AppLanguage) => void;
    setDateFormat: (val: DateFormat) => void;
    setTimeFormat: (val: TimeFormat) => void;
    setSelectedCalendarId: (val: string) => void;
    setViewingArchiveId: (id: Id | null) => void;
    setShowSettings: (val: boolean) => void;
    dispatch: (action: { type: "SET"; payload: Cycle | null }) => void;
};

export function SettingsBackupSection({
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
    selectedCalendarId,
    readOnly,
    snapshotMetas,
    importMode,
    setImportMode,
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
    setViewingArchiveId,
    setShowSettings,
    dispatch
}: SettingsBackupSectionProps) {
    const latestSnapshot = snapshotMetas.length > 0
        ? snapshotMetas[snapshotMetas.length - 1]
        : null;
    const applyImportData = (incoming: Partial<PersistedPlannerState>, mode: ImportMode = importMode): boolean => {
        const sections = summarizeImportSections(incoming);
        const modeLabel = mode === "replace"
            ? tr(language, "settings.importModeReplace")
            : tr(language, "settings.importModeMissing");
        const confirmMessage = `${tr(language, "settings.importContains", { sections: sections.join(", ") || "-" })}\n${tr(language, "settings.importMode", { mode: modeLabel })}`;
        if (!window.confirm(confirmMessage)) {
            return false;
        }

        const currentState: PersistedPlannerState = {
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
        };

        const nextState = mergeImportedPlannerState({
            current: currentState,
            incoming,
            mode
        });

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
        if (nextState.preferences.selectedCalendarId.trim()) {
            setSelectedCalendarId(nextState.preferences.selectedCalendarId);
        }
        setViewingArchiveId(null);
        setShowSettings(false);
        alert(tr(language, "settings.importSuccess"));
        return true;
    };

    const loadDemoData = async () => {
        try {
            const response = await fetch("/demo/demo-seed-3-weeks.json", {
                cache: "no-store"
            });
            if (!response.ok) {
                throw new Error("Demo seed missing");
            }
            const payload = await response.json();
            const data = parseBackupPayload(payload) as Partial<PersistedPlannerState>;
            applyImportData(data, "replace");
        } catch {
            alert(tr(language, "settings.importError"));
        }
    };

    return (
        <>
            <div className="settings-row">
                <label>{tr(language, "settings.exportData")}</label>
                <button
                    className="button"
                    onClick={() => {
                        const backup = createBackupSnapshot({
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
                        });
                        const data = JSON.stringify(backup, null, 2);
                        const blob = new Blob([data], { type: "application/json" });
                        const url = URL.createObjectURL(blob);
                        const anchor = document.createElement("a");
                        anchor.href = url;
                        anchor.download = `quarterly-backup-${toIsoDate(new Date())}.json`;
                        anchor.click();
                        URL.revokeObjectURL(url);
                    }}
                >
                    <Icon icon={Download} size={16} />
                    Export
                </button>
            </div>
            <div className="settings-row">
                <label>{tr(language, "settings.importData")}</label>
                <label className="button">
                    {tr(language, "settings.importData")}
                    <input
                        type="file"
                        accept=".json"
                        disabled={readOnly}
                        style={{ display: "none" }}
                        onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = (loadEvent) => {
                                try {
                                    const payload = JSON.parse(loadEvent.target?.result as string);
                                    const data = parseBackupPayload(payload) as Partial<PersistedPlannerState>;
                                    applyImportData(data);
                                } catch {
                                    alert(tr(language, "settings.importError"));
                                }
                            };
                            reader.readAsText(file);
                            event.target.value = "";
                        }}
                    />
                </label>
            </div>
            <div className="settings-row">
                <label>{tr(language, "settings.demoData")}</label>
                <button
                    className="button"
                    disabled={readOnly}
                    onClick={() => {
                        void loadDemoData();
                    }}
                >
                    {tr(language, "settings.loadDemoData")}
                </button>
            </div>
            <div className="settings-row">
                <label>{tr(language, "settings.importBehavior")}</label>
                <select
                    value={importMode}
                    onChange={(event) => setImportMode(event.target.value as ImportMode)}
                    className="settings-select"
                >
                    <option value="replace">{tr(language, "settings.importModeReplace")}</option>
                    <option value="merge_missing">{tr(language, "settings.importModeMissing")}</option>
                </select>
            </div>
            <div className="settings-row">
                <label>{tr(language, "settings.autosnapshotStatus")}</label>
                <span className="muted">
                    {latestSnapshot
                        ? tr(language, "settings.autosnapshotLast", {
                            date: `${formatDate(latestSnapshot.createdAt.slice(0, 10), dateFormat, language)} ${new Date(latestSnapshot.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                        })
                        : tr(language, "settings.autosnapshotActive")}
                </span>
            </div>
        </>
    );
}
