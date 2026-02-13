import { t as tr } from "../../i18n";
import { AppLanguage, SyncStatus } from "../../types";

type SettingsSyncSectionProps = {
    language: AppLanguage;
    syncEnabled: boolean;
    syncStatus: SyncStatus;
    isAuthenticated: boolean;
    authLoading: boolean;
    cloudEmail: string | null;
    authError: string | null;
    syncError: string | null;
    authMessage: string | null;
    isOnline: boolean;
    pendingLocalChangesCount: number;
    lastSyncedAt: string | null;
    onDownloadMyData: () => void;
    onSignOut: () => Promise<void>;
    onDeleteAccount: () => Promise<boolean>;
    onSyncNow: () => Promise<boolean>;
};

function getSyncStatusText(language: AppLanguage, syncStatus: SyncStatus): string {
    if (syncStatus === "syncing") return tr(language, "settings.syncStateSyncing");
    if (syncStatus === "synced") return tr(language, "settings.syncStateSynced");
    if (syncStatus === "error") return tr(language, "settings.syncStateError");
    if (syncStatus === "offline") return tr(language, "settings.syncStateOffline");
    return tr(language, "settings.syncStateSynced");
}

function formatSyncTime(language: AppLanguage, iso: string | null): string {
    if (!iso) return tr(language, "syncSheet.never");
    const locale = language === "de" ? "de-DE" : "en-US";
    return new Intl.DateTimeFormat(locale, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    }).format(new Date(iso));
}

export function SettingsSyncSection({
    language,
    syncEnabled,
    syncStatus,
    isAuthenticated,
    authLoading,
    cloudEmail,
    authError,
    syncError,
    authMessage,
    isOnline,
    pendingLocalChangesCount,
    lastSyncedAt,
    onDownloadMyData,
    onSignOut,
    onDeleteAccount,
    onSyncNow
}: SettingsSyncSectionProps) {
    return (
        <div className="settings-section">
            <h3>{tr(language, "settings.accountSyncTitle")}</h3>

            <div className="settings-subsection">
                <h4>{tr(language, "settings.accountSectionTitle")}</h4>
                {isAuthenticated ? (
                    <>
                        <p className="muted">{tr(language, "settings.accountSignedInAs", { email: cloudEmail ?? "-" })}</p>
                        <div className="button-row compact">
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
                    </>
                ) : (
                    <p className="muted">{tr(language, "settings.authInLoginHint")}</p>
                )}
            </div>

            <div className="settings-subsection">
                <h4>{tr(language, "settings.syncSectionTitle")}</h4>
                {!syncEnabled ? (
                    <p className="muted">{tr(language, "settings.syncDisabledHint")}</p>
                ) : (
                    <>
                        <div className="settings-row">
                            <label>{tr(language, "settings.syncStatus")}</label>
                            <span className={`sync-status ${syncStatus}`}>{getSyncStatusText(language, syncStatus)}</span>
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
                        <div className="button-row compact">
                            <button
                                className="button"
                                disabled={authLoading || !isAuthenticated}
                                onClick={() => {
                                    void onSyncNow();
                                }}
                            >
                                {tr(language, "settings.syncNow")}
                            </button>
                        </div>
                        <p className="muted settings-sync-offline-note">{tr(language, "settings.syncOfflineInfo")}</p>
                    </>
                )}
            </div>

            <div className="settings-subsection">
                <h4>{tr(language, "settings.dataPrivacySectionTitle")}</h4>
                <div className="settings-data-action">
                    <div>
                        <p className="settings-data-action-title">{tr(language, "settings.downloadMyData")}</p>
                        <p className="muted">{tr(language, "settings.downloadMyDataHint")}</p>
                    </div>
                    <button className="button" onClick={onDownloadMyData}>
                        {tr(language, "settings.downloadMyData")}
                    </button>
                </div>

                <div className="settings-danger-zone">
                    <p className="settings-data-action-title">{tr(language, "settings.deleteAccountTitle")}</p>
                    <p className="muted">{tr(language, "settings.deleteAccountHint")}</p>
                    <button
                        className="button danger"
                        disabled={authLoading || !isAuthenticated}
                        onClick={() => {
                            const confirmed = window.confirm(tr(language, "settings.deleteAccountConfirm"));
                            if (!confirmed) return;
                            void onDeleteAccount();
                        }}
                    >
                        {tr(language, "settings.deleteAccount")}
                    </button>
                </div>
            </div>

            {authError && <p className="muted sync-error">{authError}</p>}
            {syncError && <p className="muted sync-error">{syncError}</p>}
            {authMessage && <p className="muted">{authMessage}</p>}
        </div>
    );
}
