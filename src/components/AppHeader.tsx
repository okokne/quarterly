import { t as tr } from "../i18n";
import { AppLanguage, DateFormat, SyncStatus, Week } from "../types";
import { formatDate, formatRange } from "../utils";
import { ProgressRing } from "./ProgressRing";

type AppHeaderProps = {
    title?: string;
    startDate: string;
    selectedWeek: number;
    currentWeek: Week;
    language: AppLanguage;
    dateFormat: DateFormat;
    onOpenCycleDrawer: () => void;
    onOpenSearch: () => void;
    onOpenHeaderDetails: () => void;
    onOpenSettings: () => void;
    weekCompletion: { done: number; total: number };
    syncStatus?: SyncStatus;
};

export function AppHeader({
    title,
    startDate,
    selectedWeek,
    currentWeek,
    language,
    dateFormat,
    onOpenCycleDrawer,
    onOpenSearch,
    onOpenHeaderDetails,
    onOpenSettings,
    weekCompletion,
    syncStatus
}: AppHeaderProps) {
    return (
        <header className="header">
            <div className="header-main">
                <div>
                    <button className="header-cycle-trigger" onClick={onOpenCycleDrawer}>
                        <p className="eyebrow">Quarterly</p>
                        <h1>{title ?? "Quarterly"}</h1>
                    </button>
                    <p className="muted">{tr(language, "app.brandTagline")}</p>
                    <p className="muted">{tr(language, "app.headerStartWeek", {
                        date: formatDate(startDate, dateFormat, language),
                        week: selectedWeek,
                        range: formatRange(currentWeek.startDate, currentWeek.endDate, dateFormat, language)
                    })}</p>
                </div>
            </div>
            <div className="header-actions">
                {weekCompletion.total > 0 && (
                    <div className="header-week-progress" title={tr(language, "today.weekProgress")}>
                        <ProgressRing value={weekCompletion.done} max={weekCompletion.total} size={48} strokeWidth={6} />
                        <div className="header-week-progress-meta">
                            <strong>{tr(language, "app.headerWeekShort", { week: selectedWeek })}</strong>
                            <span>{weekCompletion.done}/{weekCompletion.total}</span>
                        </div>
                    </div>
                )}
                <button
                    onClick={onOpenCycleDrawer}
                    title={tr(language, "app.openCycleDrawer")}
                    className="icon-btn header-cycle-btn"
                >
                    🗂 <span>{tr(language, "app.cycleLabel")}</span>
                </button>
                <button
                    onClick={onOpenSearch}
                    title={tr(language, "app.searchTitle")}
                    className="icon-btn"
                >
                    🔍
                </button>
                <button
                    onClick={onOpenHeaderDetails}
                    title={tr(language, "app.detailsTitle")}
                    className="icon-btn"
                >
                    …
                </button>
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
                    onClick={onOpenSettings}
                    title={tr(language, "common.settings")}
                    className="icon-btn"
                >
                    ⚙️
                </button>
            </div>
        </header>
    );
}
