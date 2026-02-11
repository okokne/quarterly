import { t as tr } from "../i18n";
import { AppLanguage, DateFormat, SyncStatus, Week } from "../types";
import { formatDate, formatRange } from "../utils";
import { ProgressRing } from "./ProgressRing";

export type SearchResultItem = {
    type: string;
    text: string;
    week?: number;
    date?: string;
};

type AppHeaderProps = {
    title?: string;
    startDate: string;
    selectedWeek: number;
    currentWeek: Week;
    onboardingDone: boolean;
    weekCompletion: { done: number; total: number };
    language: AppLanguage;
    dateFormat: DateFormat;
    searchQuery: string;
    setSearchQuery: (value: string) => void;
    searchResults: SearchResultItem[];
    onSearchResultSelect: (result: SearchResultItem) => void;
    canUndo: boolean;
    canRedo: boolean;
    onUndo: () => void;
    onRedo: () => void;
    onOpenSettings: () => void;
    syncStatus?: SyncStatus;
};

export function AppHeader({
    title,
    startDate,
    selectedWeek,
    currentWeek,
    onboardingDone,
    weekCompletion,
    language,
    dateFormat,
    searchQuery,
    setSearchQuery,
    searchResults,
    onSearchResultSelect,
    canUndo,
    canRedo,
    onUndo,
    onRedo,
    onOpenSettings,
    syncStatus
}: AppHeaderProps) {
    return (
        <header className="header">
            <div className="header-main">
                <div>
                    <p className="eyebrow">12‑Week‑Year Planner</p>
                    <h1>{title ?? "12‑Week‑Year"}</h1>
                    <p className="muted">{tr(language, "app.headerStartWeek", {
                        date: formatDate(startDate, dateFormat, language),
                        week: selectedWeek,
                        range: formatRange(currentWeek.startDate, currentWeek.endDate, dateFormat, language)
                    })}</p>
                </div>
                {onboardingDone && weekCompletion.total > 0 && (
                    <div className="header-progress">
                        <ProgressRing value={weekCompletion.done} max={weekCompletion.total} size={72} strokeWidth={7} />
                        <span className="header-progress-label">{tr(language, "app.headerWeekShort", { week: selectedWeek })}</span>
                    </div>
                )}
            </div>
            <div className="header-right">
                <div className="search-container">
                    <input
                        type="text"
                        className="search-input"
                        placeholder={tr(language, "app.searchPlaceholder")}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchResults.length > 0 && (
                        <div className="search-results">
                            {searchResults.map((result, index) => (
                                <button
                                    key={index}
                                    className="search-result-item"
                                    onClick={() => onSearchResultSelect(result)}
                                >
                                    <span className="search-type">{result.type}</span>
                                    <span>{result.text}</span>
                                    {result.week && <span className="muted">{tr(language, "app.headerWeekShort", { week: result.week })}</span>}
                                    {result.date && <span className="muted">{formatDate(result.date, dateFormat, language)}</span>}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                <div className="header-actions">
                    {syncStatus && (
                        <span className={`sync-status ${syncStatus}`}>
                            {syncStatus === "syncing" && tr(language, "app.syncSyncing")}
                            {syncStatus === "synced" && tr(language, "app.syncSynced")}
                            {syncStatus === "error" && tr(language, "app.syncError")}
                            {syncStatus === "offline" && tr(language, "app.syncOffline")}
                            {syncStatus === "idle" && tr(language, "app.syncLocal")}
                        </span>
                    )}
                    <button
                        onClick={onUndo}
                        disabled={!canUndo}
                        title={tr(language, "app.undo")}
                        className="icon-btn"
                    >
                        ↩️
                    </button>
                    <button
                        onClick={onRedo}
                        disabled={!canRedo}
                        title={tr(language, "app.redo")}
                        className="icon-btn"
                    >
                        ↪️
                    </button>
                    <button
                        onClick={onOpenSettings}
                        title={tr(language, "common.settings")}
                        className="icon-btn"
                    >
                        ⚙️
                    </button>
                </div>
            </div>
        </header>
    );
}
