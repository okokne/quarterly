import { AppLanguage, SyncConflictResolution, SyncStatus } from "../../types";
import { t as tr } from "../../i18n";

type SettingsSyncSectionProps = {
    language: AppLanguage;
    syncEnabled: boolean;
    syncStatus: SyncStatus;
    isAuthenticated: boolean;
    authLoading: boolean;
    authEmailInput: string;
    setAuthEmailInput: (value: string) => void;
    authPasswordInput: string;
    setAuthPasswordInput: (value: string) => void;
    magicLinkRedirectUrl: string | null;
    magicLinkRedirectError: string | null;
    cloudEmail: string | null;
    pendingConflict: boolean;
    authError: string | null;
    syncError: string | null;
    authMessage: string | null;
    onSignUp: (email: string, password: string) => Promise<boolean>;
    onSignIn: (email: string, password: string) => Promise<boolean>;
    onRequestMagicLink: (email: string) => Promise<boolean>;
    onSignOut: () => Promise<void>;
    onSyncNow: () => Promise<boolean>;
    onResolveSyncConflict: (resolution: SyncConflictResolution) => Promise<boolean>;
};

function getSyncStatusText(language: AppLanguage, syncStatus: SyncStatus): string {
    if (syncStatus === "syncing") return tr(language, "app.syncSyncing");
    if (syncStatus === "synced") return tr(language, "app.syncSynced");
    if (syncStatus === "error") return tr(language, "app.syncError");
    if (syncStatus === "offline") return tr(language, "app.syncOffline");
    return tr(language, "app.syncLocal");
}

export function SettingsSyncSection({
    language,
    syncEnabled,
    syncStatus,
    isAuthenticated,
    authLoading,
    authEmailInput,
    setAuthEmailInput,
    authPasswordInput,
    setAuthPasswordInput,
    magicLinkRedirectUrl,
    magicLinkRedirectError,
    cloudEmail,
    pendingConflict,
    authError,
    syncError,
    authMessage,
    onSignUp,
    onSignIn,
    onRequestMagicLink,
    onSignOut,
    onSyncNow,
    onResolveSyncConflict
}: SettingsSyncSectionProps) {
    const syncStatusText = getSyncStatusText(language, syncStatus);

    return (
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
                                onChange={(event) => setAuthEmailInput(event.target.value)}
                                placeholder={tr(language, "settings.accountEmail")}
                                autoComplete="email"
                            />
                            <input
                                type="password"
                                value={authPasswordInput}
                                onChange={(event) => setAuthPasswordInput(event.target.value)}
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
    );
}
