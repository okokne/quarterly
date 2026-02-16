import { CloudAlert, CloudCheck, CloudOff, Search } from "./ui/icons";
import { t as tr } from "../i18n";
import { AppLanguage, SyncStatus } from "../types";
import { Icon } from "./ui/Icon";

type AppHeaderProps = {
    language: AppLanguage;
    title: string;
    context?: string;
    syncStatus?: SyncStatus;
    onOpenSearch: () => void;
    onOpenSyncStatus: () => void;
};

export function AppHeader({
    language,
    title,
    context,
    syncStatus,
    onOpenSearch,
    onOpenSyncStatus
}: AppHeaderProps) {
    const syncLabel = syncStatus === "syncing"
        ? tr(language, "app.syncBadgeSyncing")
        : syncStatus === "synced"
            ? tr(language, "app.syncBadgeSaved")
            : syncStatus === "error"
                ? tr(language, "app.syncBadgeProblem")
                : syncStatus === "offline"
                    ? tr(language, "app.syncBadgeOffline")
                    : tr(language, "app.syncBadgeSaved");
    const syncIcon = syncStatus === "syncing"
        ? CloudCheck
        : syncStatus === "error"
            ? CloudAlert
            : syncStatus === "offline"
                ? CloudOff
                : CloudCheck;

    return (
        <header className="app-content-header">
            <div className="app-content-header-main">
                <h1>{title}</h1>
                {context && <p className="muted">{context}</p>}
            </div>
            <div className="app-content-header-actions">
                <button
                    type="button"
                    className="icon-btn"
                    onClick={onOpenSearch}
                    title={tr(language, "app.searchTitle")}
                    aria-label={tr(language, "app.searchTitle")}
                >
                    <Icon icon={Search} size={14} />
                </button>
                {syncStatus && (
                    <button
                        type="button"
                        className={`sync-status sync-status-button ${syncStatus}`}
                        onClick={onOpenSyncStatus}
                        title={tr(language, "app.openSyncStatus")}
                    >
                        <Icon icon={syncIcon} size={12} className="sync-status-icon" />
                        {syncLabel}
                    </button>
                )}
            </div>
        </header>
    );
}

