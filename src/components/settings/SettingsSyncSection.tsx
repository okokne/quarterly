import { useMemo, useState } from "react";
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
    onChangePassword: (newPassword: string) => Promise<boolean>;
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
    onChangePassword,
    onSyncNow
}: SettingsSyncSectionProps) {
    const [showChangePassword, setShowChangePassword] = useState(false);
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [passwordFormError, setPasswordFormError] = useState<string | null>(null);

    const passwordRules = useMemo(() => ({
        hasMinLength: newPassword.length >= 10,
        hasUpperCase: /[A-Z]/.test(newPassword),
        hasLowerCase: /[a-z]/.test(newPassword)
    }), [newPassword]);
    const passwordValid = passwordRules.hasMinLength && passwordRules.hasUpperCase && passwordRules.hasLowerCase;
    const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

    const handleSubmitPasswordChange = () => {
        if (!passwordValid) {
            setPasswordFormError(tr(language, "auth.passwordRulesInfo"));
            return;
        }
        if (!passwordsMatch) {
            setPasswordFormError(tr(language, "auth.passwordMismatch"));
            return;
        }
        setPasswordFormError(null);
        void (async () => {
            const ok = await onChangePassword(newPassword);
            if (!ok) return;
            setNewPassword("");
            setConfirmPassword("");
            setShowChangePassword(false);
        })();
    };

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
                            <button
                                className="button ghost"
                                disabled={authLoading}
                                onClick={() => {
                                    setPasswordFormError(null);
                                    setShowChangePassword((value) => !value);
                                }}
                            >
                                {tr(language, "settings.changePassword")}
                            </button>
                        </div>
                        {showChangePassword && (
                            <div className="settings-password-form">
                                <label>
                                    {tr(language, "settings.newPassword")}
                                    <input
                                        type="password"
                                        autoComplete="new-password"
                                        value={newPassword}
                                        onChange={(event) => setNewPassword(event.target.value)}
                                    />
                                </label>
                                <div className="auth-password-rules">
                                    <p className="hint">{tr(language, "auth.passwordRulesInfo")}</p>
                                    <p className={`auth-password-rule ${passwordRules.hasMinLength ? "met" : "unmet"}`}>
                                        {tr(language, "auth.passwordRuleMinLength")}
                                    </p>
                                    <p className={`auth-password-rule ${passwordRules.hasUpperCase ? "met" : "unmet"}`}>
                                        {tr(language, "auth.passwordRuleUppercase")}
                                    </p>
                                    <p className={`auth-password-rule ${passwordRules.hasLowerCase ? "met" : "unmet"}`}>
                                        {tr(language, "auth.passwordRuleLowercase")}
                                    </p>
                                </div>
                                <label>
                                    {tr(language, "settings.newPasswordConfirm")}
                                    <input
                                        type="password"
                                        autoComplete="new-password"
                                        value={confirmPassword}
                                        onChange={(event) => setConfirmPassword(event.target.value)}
                                    />
                                </label>
                                {passwordFormError ? <p className="muted sync-error">{passwordFormError}</p> : null}
                                <div className="button-row compact">
                                    <button
                                        className="button"
                                        disabled={authLoading}
                                        onClick={handleSubmitPasswordChange}
                                    >
                                        {tr(language, "settings.savePassword")}
                                    </button>
                                    <button
                                        className="button ghost"
                                        disabled={authLoading}
                                        onClick={() => {
                                            setShowChangePassword(false);
                                            setPasswordFormError(null);
                                        }}
                                    >
                                        {tr(language, "common.cancel")}
                                    </button>
                                </div>
                            </div>
                        )}
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
                        {tr(language, "settings.downloadSnapshot")}
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
