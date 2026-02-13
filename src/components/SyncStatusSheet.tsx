import { t as tr } from "../i18n";
import { AppLanguage, SyncStatus } from "../types";

type SyncStatusSheetProps = {
    open: boolean;
    language: AppLanguage;
    syncEnabled: boolean;
    syncStatus: SyncStatus;
    isOnline: boolean;
    lastSyncedAt: string | null;
    pendingLocalChangesCount: number;
    onSyncNow: () => Promise<boolean>;
    onClose: () => void;
};

function formatSyncTime(language: AppLanguage, iso: string | null): string {
    if (!iso) return tr(language, "syncSheet.never");
    const locale = language === "de" ? "de-DE" : "en-US";
    const date = new Date(iso);
    return new Intl.DateTimeFormat(locale, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    }).format(date);
}

export function SyncStatusSheet({
    open,
    language,
    syncEnabled,
    syncStatus,
    isOnline,
    lastSyncedAt,
    pendingLocalChangesCount,
    onSyncNow,
    onClose
}: SyncStatusSheetProps) {
    if (!open) return null;

    return (
        <div className="overlay-backdrop" onClick={onClose}>
            <div className="overlay-card sync-status-sheet" onClick={(event) => event.stopPropagation()}>
                <div className="overlay-header">
                    <h3>{tr(language, "syncSheet.title")}</h3>
                    <button className="icon-btn" onClick={onClose} aria-label={tr(language, "common.close")}>✕</button>
                </div>

                {!syncEnabled ? (
                    <p className="warning-text">{tr(language, "settings.syncDisabledHint")}</p>
                ) : (
                    <>
                        <div className="settings-row">
                            <label>{tr(language, "settings.syncStatus")}</label>
                            <span className={`sync-status ${syncStatus}`}>
                                {syncStatus === "syncing" ? tr(language, "app.syncBadgeSyncing") : null}
                                {syncStatus === "synced" ? tr(language, "app.syncBadgeSaved") : null}
                                {syncStatus === "error" ? tr(language, "app.syncBadgeProblem") : null}
                                {syncStatus === "offline" ? tr(language, "app.syncBadgeOffline") : null}
                                {syncStatus === "idle" ? tr(language, "app.syncBadgeSaved") : null}
                            </span>
                        </div>
                        <div className="settings-row">
                            <label>{tr(language, "syncSheet.lastSync")}</label>
                            <span className="muted">{formatSyncTime(language, lastSyncedAt)}</span>
                        </div>
                        <div className="settings-row">
                            <label>{tr(language, "syncSheet.pendingChanges")}</label>
                            <span className="muted">{pendingLocalChangesCount}</span>
                        </div>
                        <div className="settings-row">
                            <label>{tr(language, "syncSheet.connection")}</label>
                            <span className="muted">
                                {isOnline ? tr(language, "syncSheet.online") : tr(language, "syncSheet.offline")}
                            </span>
                        </div>
                        <div className="button-row">
                            <button className="button" onClick={() => { void onSyncNow(); }}>
                                {tr(language, "settings.syncNow")}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
