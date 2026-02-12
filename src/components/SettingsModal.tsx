import { useState } from "react";
import {
    AppLanguage,
    CALENDAR_ID_STORAGE_KEY,
    Cycle,
    DailyTemplate,
    DateFormat,
    Habit,
    Id,
    LocalSnapshotMeta,
    PersistedPlannerState,
    SyncConflictResolution,
    SyncStatus,
    TimeFormat
} from "../types";
import { t as tr } from "../i18n";
import { uid, toIsoDate, formatDate } from "../utils";
import { createBackupSnapshot, parseBackupPayload } from "../backup";
import { ToggleSwitch } from "./ToggleSwitch";
import { ImportMode, mergeImportedPlannerState, summarizeImportSections } from "../persistence/stateSerializer";
import {
    signIn,
    signOut,
    listCalendars,
    GoogleCalendar
} from "../googleCalendar";

export interface SettingsModalProps {
    cycle: Cycle | null;
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
    setShowDemoConfirm: (val: boolean) => void;
    setShowDeleteConfirm: (val: boolean) => void;
    setViewingArchiveId: (id: Id | null) => void;
    setShowArchiveDeleteConfirm: (id: Id | null) => void;
    // Dispatch
    dispatch: (action: { type: 'SET'; payload: Cycle | null }) => void;
    // Handlers
    handleRequestNotifications: () => void;
    updateCycle: (updater: (prev: Cycle) => Cycle) => void;

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
    magicLinkRedirectUrl: string | null;
    magicLinkRedirectError: string | null;
    cloudEmail: string | null;
    syncError: string | null;
    pendingConflict: boolean;
    onSignUp: (email: string, password: string) => Promise<boolean>;
    onSignIn: (email: string, password: string) => Promise<boolean>;
    onRequestMagicLink: (email: string) => Promise<boolean>;
    onSignOut: () => Promise<void>;
    onSyncNow: () => Promise<boolean>;
    onResolveSyncConflict: (resolution: SyncConflictResolution) => Promise<boolean>;
}

export function SettingsModal({
    cycle,
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
    setShowDemoConfirm,
    setShowDeleteConfirm,
    setViewingArchiveId,
    setShowArchiveDeleteConfirm,
    dispatch,
    handleRequestNotifications,
    updateCycle,
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
    magicLinkRedirectUrl,
    magicLinkRedirectError,
    cloudEmail,
    syncError,
    pendingConflict,
    onSignUp,
    onSignIn,
    onRequestMagicLink,
    onSignOut,
    onSyncNow,
    onResolveSyncConflict
}: SettingsModalProps) {
    const EMOJI_OPTIONS = [
        "🌅", "💧", "📝", "🧘", "🏋️", "📚", "🍎", "😴", "☕", "🚀",
        "🎯", "🎨", "🎵", "📵", "🧠", "🏃", "🚴", "🥗", "📖", "💻",
        "🧹", "🧽", "🧺", "🪴", "🐶", "🐱", "🧗", "🧘‍♂️", "🧘‍♀️", "🧊",
        "🥤", "🥛", "🥑", "🍳", "🥦", "🫧", "🪥", "🛏️", "🪞", "🧴",
        "🧩", "🎹", "🎸", "🎻", "🪕", "🎤", "🧪", "📈", "✅", "📌"
    ];
    const [showHabitForm, setShowHabitForm] = useState(false);
    const [habitEmoji, setHabitEmoji] = useState(EMOJI_OPTIONS[0]);
    const [habitTitle, setHabitTitle] = useState("");
    const [habitFreq, setHabitFreq] = useState<'daily' | 'custom'>('daily');
    const [habitCustomDays, setHabitCustomDays] = useState<number[]>([]);
    const [habitStartDate, setHabitStartDate] = useState(() => toIsoDate(new Date()));
    const [habitGoalType, setHabitGoalType] = useState<'open' | 'target'>('open');
    const [habitGoalTarget, setHabitGoalTarget] = useState<string>("30"); // Keep as string for input
    const [habitGoalUnit, setHabitGoalUnit] = useState<string>("");
    const [importMode, setImportMode] = useState<ImportMode>("replace");
    const [authEmailInput, setAuthEmailInput] = useState("");
    const [authPasswordInput, setAuthPasswordInput] = useState("");
    const weekdayShortLabels = language === "de"
        ? ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"]
        : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const latestSnapshot = snapshotMetas.length > 0
        ? snapshotMetas[snapshotMetas.length - 1]
        : null;
    const syncStatusText = syncStatus === "syncing"
        ? tr(language, "app.syncSyncing")
        : syncStatus === "synced"
            ? tr(language, "app.syncSynced")
            : syncStatus === "error"
                ? tr(language, "app.syncError")
                : syncStatus === "offline"
                    ? tr(language, "app.syncOffline")
                    : tr(language, "app.syncLocal");

    const handleAddHabit = () => {
        if (readOnly) return;
        if (!habitTitle.trim()) return;
        if (habitFreq === "custom" && habitCustomDays.length === 0) return;
        const today = toIsoDate(new Date());
        const parsedGoalTarget = Number.parseInt(habitGoalTarget, 10);
        const normalizedGoalTarget = Number.isFinite(parsedGoalTarget)
            ? Math.max(1, parsedGoalTarget)
            : 1;

        const goal: Habit['goal'] = habitGoalType === 'target'
            ? { type: 'target', target: normalizedGoalTarget, unit: habitGoalUnit.trim() }
            : { type: 'open' };

        const newHabit: Habit = {
            id: uid(),
            title: habitTitle.trim(),
            emoji: habitEmoji,
            frequency: habitFreq === 'custom' ? habitCustomDays : habitFreq,
            activeFrom: 1, // Legacy/Cycle specific - keep for compatibility
            activeTo: 12, // Legacy
            startedAt: habitStartDate,
            createdAt: today,
            goal
        };

        setHabits([...habits, newHabit]);

        setHabitTitle("");
        setHabitEmoji(EMOJI_OPTIONS[0]);
        setHabitFreq('daily');
        setHabitCustomDays([]);
        setHabitStartDate(toIsoDate(new Date()));
        setShowHabitForm(false);
    };

    const handleDeleteHabit = (id: Id) => {
        if (readOnly) return;
        if (window.confirm(tr(language, "settings.confirmDeleteHabit"))) {
            setHabits(habits.filter((h) => h.id !== id));
            const nextLog: Record<string, string[]> = {};
            Object.entries(habitLog).forEach(([date, ids]) => {
                const filtered = ids.filter((habitId) => habitId !== id);
                if (filtered.length > 0) nextLog[date] = filtered;
            });
            setHabitLog(nextLog);
        }
    };


    const getFreqLabel = (freq: Habit['frequency']) => {
        if (freq === 'daily') return tr(language, "settings.daily");
        if (freq === 'weekdays') return tr(language, "settings.weekdays");
        if (Array.isArray(freq)) {
            return freq.map((d) => weekdayShortLabels[d]).join(', ');
        }
        return '';
    };
    return (
        <div className="settings-overlay" onClick={() => setShowSettings(false)}>
            <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
                <div className="settings-header">
                    <h2>{tr(language, "settings.title")}</h2>
                    <button className="settings-close" onClick={() => setShowSettings(false)}>×</button>
                </div>

                <div className="settings-section">
                    <h3>{tr(language, "common.design")}</h3>
                    <div className="settings-row">
                        <label>{tr(language, "settings.darkMode")}</label>
                        <ToggleSwitch checked={darkMode} onChange={setDarkMode} />
                    </div>
                </div>

                <div className="settings-section">
                    <h3>{tr(language, "common.format")}</h3>
                    <div className="settings-row">
                        <label>{tr(language, "common.language")}</label>
                        <select
                            value={language}
                            onChange={(e) => setLanguage(e.target.value as AppLanguage)}
                            className="settings-select"
                        >
                            <option value="de">🇩🇪 {tr(language, "common.german")}</option>
                            <option value="en">🇬🇧 {tr(language, "common.english")}</option>
                        </select>
                    </div>
                    <div className="settings-row">
                        <label>{tr(language, "settings.dateFormat")}</label>
                        <select
                            value={dateFormat}
                            onChange={(e) => setDateFormat(e.target.value as DateFormat)}
                            className="settings-select"
                        >
                            <option value="eu_short">DD.MM.YYYY</option>
                            <option value="eu_long">DD. MMMM YYYY</option>
                            <option value="iso">YYYY-MM-DD</option>
                        </select>
                    </div>
                    <div className="settings-row">
                        <label>{tr(language, "settings.timeFormat")}</label>
                        <select
                            value={timeFormat}
                            onChange={(e) => setTimeFormat(e.target.value as TimeFormat)}
                            className="settings-select"
                        >
                            <option value="24h">24h</option>
                            <option value="12h">12h AM/PM</option>
                        </select>
                    </div>
                </div>

                <div className="settings-section">
                    <h3>{tr(language, "common.importExport")}</h3>
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
                                const a = document.createElement("a");
                                a.href = url;
                                a.download = `quarterly-backup-${toIsoDate(new Date())}.json`;
                                a.click();
                                URL.revokeObjectURL(url);
                            }}
                        >
                            📤 Export
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
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    const reader = new FileReader();
                                    reader.onload = (event) => {
                                        try {
                                            const payload = JSON.parse(event.target?.result as string);
                                            const data = parseBackupPayload(payload);
                                            const sections = summarizeImportSections(data as Partial<PersistedPlannerState>);
                                            const modeLabel = importMode === "replace"
                                                ? tr(language, "settings.importModeReplace")
                                                : tr(language, "settings.importModeMissing");
                                            const confirmMessage = `${tr(language, "settings.importContains", { sections: sections.join(", ") || "-" })}\n${tr(language, "settings.importMode", { mode: modeLabel })}`;
                                            if (!window.confirm(confirmMessage)) {
                                                return;
                                            }

                                            const currentState: PersistedPlannerState = {
                                                cycle: activeCycle,
                                                templates,
                                                history,
                                                habits,
                                                habitLog,
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
                                                incoming: data as Partial<PersistedPlannerState>,
                                                mode: importMode
                                            });

                                            dispatch({ type: 'SET', payload: nextState.cycle });
                                            setTemplates(nextState.templates);
                                            setHistory(() => nextState.history);
                                            setHabits(nextState.habits);
                                            setHabitLog(nextState.habitLog);

                                            setDarkMode(nextState.preferences.darkMode);
                                            setLanguage(nextState.preferences.language);
                                            setDateFormat(nextState.preferences.dateFormat);
                                            setTimeFormat(nextState.preferences.timeFormat);
                                            if (nextState.preferences.selectedCalendarId.trim()) {
                                                setSelectedCalendarId(nextState.preferences.selectedCalendarId);
                                                try {
                                                    localStorage.setItem(CALENDAR_ID_STORAGE_KEY, nextState.preferences.selectedCalendarId);
                                                } catch (err) {
                                                    console.error("Failed to persist calendar id:", err);
                                                }
                                            }
                                            setViewingArchiveId(null);
                                            setShowSettings(false);
                                            alert(tr(language, "settings.importSuccess"));
                                        } catch {
                                            alert(tr(language, "settings.importError"));
                                        }
                                    };
                                    reader.readAsText(file);
                                    e.target.value = "";
                                }}
                            />
                        </label>
                    </div>
                    <div className="settings-row">
                        <label>{tr(language, "settings.importBehavior")}</label>
                        <select
                            value={importMode}
                            onChange={(e) => setImportMode(e.target.value as ImportMode)}
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
                    <div className="settings-row">
                        <label>{tr(language, "settings.googleConnect")}</label>
                        {googleLoading ? (
                            <span className="muted">{tr(language, "settings.loading")}</span>
                        ) : googleConnected ? (
                            <button
                                className="button"
                                disabled={readOnly}
                                onClick={async () => {
                                    signOut();
                                    setGoogleConnected(false);
                                    setCalendarList([]);
                                }}
                            >
                                {tr(language, "settings.disconnect")}
                            </button>
                        ) : (
                            <button
                                className="button"
                                disabled={readOnly}
                                onClick={async () => {
                                    try {
                                        await signIn();
                                        setGoogleConnected(true);
                                        const calendars = await listCalendars();
                                        setCalendarList(calendars);
                                    } catch (err) {
                                        console.error('Google sign-in failed:', err);
                                    }
                                }}
                            >
                                {tr(language, "settings.connect")}
                            </button>
                        )}
                    </div>
                    {googleConnected && (
                        <div className="settings-row">
                            <label>{tr(language, "settings.targetCalendar")}</label>
                            {calendarList.length === 0 ? (
                                <button
                                    className="button"
                                    disabled={readOnly}
                                    onClick={async () => {
                                        const calendars = await listCalendars();
                                        setCalendarList(calendars);
                                    }}
                                >
                                    {tr(language, "settings.loadCalendars")}
                                </button>
                            ) : (
                                <select
                                    value={selectedCalendarId}
                                    disabled={readOnly}
                                    onChange={(e) => {
                                        setSelectedCalendarId(e.target.value);
                                        try {
                                            localStorage.setItem(CALENDAR_ID_STORAGE_KEY, e.target.value);
                                        } catch (err) {
                                            console.error("Failed to persist calendar id:", err);
                                        }
                                    }}
                                    className="settings-select"
                                >
                                    {calendarList.map((cal) => (
                                        <option key={cal.id} value={cal.id}>
                                            {cal.summary} {cal.primary ? tr(language, "settings.primaryCalendar") : ''}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>
                    )}
                </div>

                <div className="settings-section">
                    <h3>{tr(language, "settings.accountSyncTitle")}</h3>
                    {!syncEnabled ? (
                        <p className="muted">{tr(language, "settings.syncDisabledHint")}</p>
                    ) : (
                        <>
                            <div className="settings-row">
                                <label>{tr(language, "settings.syncStatus")}</label>
                                <span className={`sync-status ${syncStatus}`}>{syncStatusText}</span>
                            </div>
                            {!isAuthenticated ? (
                                <div className="settings-auth-box">
                                    <input
                                        type="email"
                                        value={authEmailInput}
                                        onChange={(e) => setAuthEmailInput(e.target.value)}
                                        placeholder={tr(language, "settings.accountEmail")}
                                        autoComplete="email"
                                    />
                                    <input
                                        type="password"
                                        value={authPasswordInput}
                                        onChange={(e) => setAuthPasswordInput(e.target.value)}
                                        placeholder={tr(language, "settings.accountPassword")}
                                        autoComplete="current-password"
                                    />
                                    <div className="button-row compact">
                                        <button
                                            className="button"
                                            disabled={authLoading || !authEmailInput.trim() || authPasswordInput.length < 6}
                                            onClick={() => {
                                                void onSignUp(authEmailInput.trim(), authPasswordInput);
                                            }}
                                        >
                                            {tr(language, "settings.accountCreate")}
                                        </button>
                                        <button
                                            className="button primary"
                                            disabled={authLoading || !authEmailInput.trim() || authPasswordInput.length < 6}
                                            onClick={() => {
                                                void onSignIn(authEmailInput.trim(), authPasswordInput);
                                            }}
                                        >
                                            {tr(language, "settings.accountSignIn")}
                                        </button>
                                    </div>
                                    <p className="muted">{tr(language, "settings.accountMagicHint")}</p>
                                    <button
                                        className="button"
                                        disabled={authLoading || !authEmailInput.trim()}
                                        onClick={() => {
                                            void onRequestMagicLink(authEmailInput.trim());
                                        }}
                                    >
                                        {tr(language, "settings.accountMagicLink")}
                                    </button>
                                    {magicLinkRedirectUrl && (
                                        <p className="hint">{tr(language, "settings.accountMagicRedirect", { url: magicLinkRedirectUrl })}</p>
                                    )}
                                    {magicLinkRedirectError && <p className="muted sync-error">{magicLinkRedirectError}</p>}
                                </div>
                            ) : (
                                <div className="settings-auth-box">
                                    <p className="muted">{tr(language, "settings.accountSignedInAs", { email: cloudEmail ?? "-" })}</p>
                                    <div className="button-row compact">
                                        <button
                                            className="button"
                                            disabled={authLoading}
                                            onClick={() => {
                                                void onSyncNow();
                                            }}
                                        >
                                            {tr(language, "settings.syncNow")}
                                        </button>
                                        <button
                                            className="button"
                                            disabled={authLoading}
                                            onClick={() => {
                                                void onSignOut();
                                            }}
                                        >
                                            {tr(language, "settings.accountSignOut")}
                                        </button>
                                    </div>
                                </div>
                            )}
                            {pendingConflict && (
                                <div className="sync-conflict-box">
                                    <p>{tr(language, "settings.syncConflictHint")}</p>
                                    <div className="button-row compact">
                                        <button
                                            className="button"
                                            disabled={authLoading}
                                            onClick={() => {
                                                void onResolveSyncConflict("keep_local");
                                            }}
                                        >
                                            {tr(language, "settings.syncKeepLocal")}
                                        </button>
                                        <button
                                            className="button"
                                            disabled={authLoading}
                                            onClick={() => {
                                                void onResolveSyncConflict("keep_cloud");
                                            }}
                                        >
                                            {tr(language, "settings.syncKeepCloud")}
                                        </button>
                                        <button
                                            className="button"
                                            disabled={authLoading}
                                            onClick={() => {
                                                void onResolveSyncConflict("export_both");
                                            }}
                                        >
                                            {tr(language, "settings.syncExportBoth")}
                                        </button>
                                    </div>
                                </div>
                            )}
                            {authError && <p className="muted sync-error">{authError}</p>}
                            {syncError && <p className="muted sync-error">{syncError}</p>}
                            {authMessage && <p className="muted">{authMessage}</p>}
                        </>
                    )}
                </div>

                <div className="settings-section">
                    <h3>{tr(language, "common.notifications")}</h3>
                    <div className="settings-row">
                        <label>{tr(language, "settings.weeklyReminder")}</label>
                        <button className="button" disabled={readOnly} onClick={handleRequestNotifications}>{tr(language, "settings.enable")}</button>
                    </div>
                </div>

                {/* Habit Management */}
                {cycle && (
                    <div className="settings-section">
                        <h3>🔁 {tr(language, "common.habits")}</h3>
                        {habits.length > 0 ? (
                            <div className="habit-settings-list">
                                {habits.map((h) => (
                                    <div key={h.id} className="habit-settings-item">
                                        <div className="habit-settings-item-info">
                                            <span className="emoji">{h.emoji}</span>
                                            <div>
                                                <div className="title">{h.title}</div>
                                                <div className="meta">
                                                    {getFreqLabel(h.frequency)}
                                                    {h.goal?.type === 'target' && ` · ${tr(language, "settings.goal")}: ${h.goal.target} ${h.goal.unit || ''}`}
                                                </div>
                                            </div>
                                        </div>
                                        <button className="button ghost-danger" disabled={readOnly} onClick={() => handleDeleteHabit(h.id)}>🗑️</button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="muted" style={{ padding: '0 8px' }}>{tr(language, "settings.noHabits")}</p>
                        )}
                        {showHabitForm ? (
                            <div className="habit-settings-form">
                                <div className="habit-emoji-picker">
                                    {EMOJI_OPTIONS.map((e) => (
                                        <button
                                            key={e}
                                            className={`habit-emoji-btn ${habitEmoji === e ? 'selected' : ''}`}
                                            disabled={readOnly}
                                            onClick={() => setHabitEmoji(e)}
                                        >{e}</button>
                                    ))}
                                </div>
                                <div className="habit-settings-form-row">
                                    <input
                                        type="text"
                                        placeholder={tr(language, "settings.habitNamePlaceholder")}
                                        value={habitTitle}
                                        disabled={readOnly}
                                        onChange={(e) => setHabitTitle(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddHabit()}
                                        autoFocus
                                    />
                                </div>
                                <div className="habit-settings-form-row">
                                    <label>
                                        {tr(language, "settings.habitStartDate")}
                                        <input
                                            type="date"
                                            value={habitStartDate}
                                            disabled={readOnly}
                                            onChange={(e) => setHabitStartDate(e.target.value)}
                                        />
                                    </label>
                                </div>
                                <div className="habit-freq-chips">
                                    <button
                                        className={`habit-freq-chip ${habitFreq === 'daily' ? 'selected' : ''}`}
                                        disabled={readOnly}
                                        onClick={() => setHabitFreq('daily')}
                                    >{tr(language, "settings.daily")}</button>
                                    <button
                                        className={`habit-freq-chip ${habitFreq === 'custom' ? 'selected' : ''}`}
                                        disabled={readOnly}
                                        onClick={() => setHabitFreq('custom')}
                                    >{tr(language, "settings.customDays")}</button>
                                </div>
                                {habitFreq === 'custom' && (
                                    <div className="habit-freq-chips">
                                        {weekdayShortLabels.map((label, i) => (
                                            <button
                                                key={i}
                                                className={`habit-freq-chip ${habitCustomDays.includes(i) ? 'selected' : ''}`}
                                                disabled={readOnly}
                                                onClick={() => setHabitCustomDays((prev) =>
                                                    prev.includes(i) ? prev.filter((d) => d !== i) : [...prev, i]
                                                )}
                                            >{label}</button>
                                        ))}
                                    </div>
                                )}

                                <div className="habit-settings-form-row" style={{ marginTop: '12px' }}>
                                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                        {tr(language, "settings.goalTarget")}
                                    </label>
                                    <div className="habit-freq-chips">
                                        <button
                                            className={`habit-freq-chip ${habitGoalType === 'open' ? 'selected' : ''}`}
                                            disabled={readOnly}
                                            onClick={() => setHabitGoalType('open')}
                                        >{tr(language, "settings.goalOpen")}</button>
                                        <button
                                            className={`habit-freq-chip ${habitGoalType === 'target' ? 'selected' : ''}`}
                                            disabled={readOnly}
                                            onClick={() => setHabitGoalType('target')}
                                        >{tr(language, "settings.goalFixed")}</button>
                                    </div>
                                </div>

                                {habitGoalType === 'target' && (
                                    <div className="habit-settings-form-row" style={{ display: 'flex', gap: '8px' }}>
                                        <input
                                            type="number"
                                            min="1"
                                            placeholder="30"
                                            value={habitGoalTarget}
                                            disabled={readOnly}
                                            onChange={(e) => setHabitGoalTarget(e.target.value)}
                                            style={{ width: '80px' }}
                                        />
                                        <input
                                            type="text"
                                            placeholder={tr(language, "settings.unitPlaceholder")}
                                            value={habitGoalUnit}
                                            disabled={readOnly}
                                            onChange={(e) => setHabitGoalUnit(e.target.value)}
                                            style={{ flex: 1 }}
                                        />
                                    </div>
                                )}

                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
                                    <button className="button" onClick={() => setShowHabitForm(false)}>{tr(language, "common.cancel")}</button>
                                    <button
                                        className="button accent"
                                        onClick={handleAddHabit}
                                        disabled={readOnly || !habitTitle.trim() || (habitFreq === "custom" && habitCustomDays.length === 0)}
                                    >
                                        {tr(language, "common.save")}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button
                                className="button" style={{ marginTop: '8px' }}
                                disabled={readOnly}
                                onClick={() => setShowHabitForm(true)}
                            >{tr(language, "settings.addHabit")}</button>
                        )}
                    </div>
                )}

                <div className="settings-section">
                    <h3>{tr(language, "common.archive")}</h3>
                    {history.length === 0 ? (
                        <p className="muted" style={{ padding: '0 8px' }}>{tr(language, "settings.noArchive")}</p>
                    ) : (
                        <div className="list" style={{ gap: '8px' }}>
                            {history.map(c => (
                                <div key={c.id} className="settings-row">
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                        <strong>{c.title || tr(language, "settings.untitled")}</strong>
                                        <span className="muted" style={{ fontSize: '0.8rem' }}>
                                            {c.startDate ? formatDate(c.startDate, dateFormat, language) : ""}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button className="button" onClick={() => {
                                            setViewingArchiveId(c.id);
                                            setShowSettings(false);
                                        }}>{tr(language, "common.view")}</button>
                                        <button className="button ghost-danger" disabled={readOnly} onClick={() => {
                                            setShowArchiveDeleteConfirm(c.id);
                                        }}>🗑️</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="settings-section">
                    <h3>{tr(language, "common.data")}</h3>
                    <div className="settings-row">
                        <label>{tr(language, "settings.loadDemo")}</label>
                        <button className="button" disabled={readOnly} onClick={() => { setShowSettings(false); setShowDemoConfirm(true); }}>{tr(language, "settings.loadDemo")}</button>
                    </div>
                    <div className="settings-row">
                        <label>{tr(language, "settings.completeCycle")}</label>
                        <button className="button" disabled={readOnly} onClick={() => { setShowSettings(false); setShowDeleteConfirm(true); }}>
                            {tr(language, "settings.archiveRestart")}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
