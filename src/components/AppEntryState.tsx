import { useMemo, useState } from "react";
import { AppLanguage } from "../types";
import { t as tr } from "../i18n";

type AuthMode = "email" | "password" | "registerPrompt" | "register" | "code";

type AppEntryStateProps = {
    language: AppLanguage;
    awaitingCloudDashboard: boolean;
    syncEnabled: boolean;
    isAuthenticated: boolean;
    cloudEmail: string | null;
    authError: string | null;
    syncError: string | null;
    authMessage: string | null;
    magicLinkRedirectUrl: string | null;
    magicLinkRedirectError: string | null;
    authLoading: boolean;
    entryEmail: string;
    setEntryEmail: (value: string) => void;
    entryPassword: string;
    setEntryPassword: (value: string) => void;
    titleInput: string;
    setTitleInput: (value: string) => void;
    startDateInput: string;
    setStartDateInput: (value: string) => void;
    onRequestSyncNow: () => Promise<boolean>;
    onSignOut: () => Promise<void>;
    onSignIn: (email: string, password: string) => Promise<boolean>;
    onSignUp: (email: string, password: string) => Promise<boolean>;
    onCheckEmailAccount: (email: string) => Promise<"exists" | "missing" | "error">;
    onRequestOneTimeCode: (email: string) => Promise<boolean>;
    onVerifyOneTimeCode: (email: string, code: string) => Promise<boolean>;
    onRequestMagicLink: (email: string) => Promise<boolean>;
    onCreateCycle: () => void;
};

export function AppEntryState({
    language,
    awaitingCloudDashboard,
    syncEnabled,
    isAuthenticated,
    cloudEmail,
    authError,
    syncError,
    authMessage,
    magicLinkRedirectUrl,
    magicLinkRedirectError,
    authLoading,
    entryEmail,
    setEntryEmail,
    entryPassword,
    setEntryPassword,
    titleInput,
    setTitleInput,
    startDateInput,
    setStartDateInput,
    onRequestSyncNow,
    onSignOut,
    onSignIn,
    onSignUp,
    onCheckEmailAccount,
    onRequestOneTimeCode,
    onVerifyOneTimeCode,
    onRequestMagicLink,
    onCreateCycle
}: AppEntryStateProps) {
    const [authMode, setAuthMode] = useState<AuthMode>("email");
    const [registerConfirm, setRegisterConfirm] = useState("");
    const [codeInput, setCodeInput] = useState("");
    const [codePrimed, setCodePrimed] = useState(false);
    const [localAuthHint, setLocalAuthHint] = useState<string | null>(null);
    const emailTrimmed = useMemo(() => entryEmail.trim(), [entryEmail]);

    const resetAuthFlow = () => {
        setAuthMode("email");
        setEntryPassword("");
        setRegisterConfirm("");
        setCodeInput("");
        setCodePrimed(false);
        setLocalAuthHint(null);
    };

    const continueWithEmail = async () => {
        if (!emailTrimmed) return;
        setLocalAuthHint(null);
        const result = await onCheckEmailAccount(emailTrimmed);
        if (result === "exists") {
            setAuthMode("password");
            setCodePrimed(true);
            return;
        }
        if (result === "missing") {
            setAuthMode("registerPrompt");
        }
    };

    const requestCodeAndOpen = async () => {
        if (!emailTrimmed) return;
        if (codePrimed) {
            setCodeInput("");
            setAuthMode("code");
            return;
        }
        const ok = await onRequestOneTimeCode(emailTrimmed);
        if (!ok) return;
        setCodePrimed(true);
        setCodeInput("");
        setAuthMode("code");
    };

    return (
        <div className="page">
            <header className="hero">
                <div>
                    <p className="eyebrow">Quarterly</p>
                    <h1>{tr(language, "empty.heroTitle")}</h1>
                    <p>{tr(language, "empty.heroSubtitle")}</p>
                </div>
            </header>

            {awaitingCloudDashboard && (
                <section className="card">
                    <h2>{tr(language, "auth.restoringTitle")}</h2>
                    <p className="muted">{tr(language, "auth.restoringBody")}</p>
                </section>
            )}

            {!awaitingCloudDashboard && !isAuthenticated && (
                <section className="card">
                    <h2>{tr(language, "auth.entryTitle")}</h2>
                    {!syncEnabled && (
                        <p className="warning-text">{tr(language, "settings.syncDisabledHint")}</p>
                    )}
                    <p className="muted">{tr(language, "auth.entrySubtitle")}</p>

                    {authError && <p className="error-text">{authError}</p>}
                    {syncError && <p className="error-text">{syncError}</p>}
                    {authMessage && <p className="hint">{authMessage}</p>}
                    {localAuthHint && <p className="hint">{localAuthHint}</p>}
                    {magicLinkRedirectUrl && (
                        <p className="hint">{tr(language, "settings.accountMagicRedirect", { url: magicLinkRedirectUrl })}</p>
                    )}
                    {magicLinkRedirectError && <p className="error-text">{magicLinkRedirectError}</p>}

                    <div className="settings-auth-box auth-entry-box">
                        <label>
                            {tr(language, "settings.accountEmail")}
                            <input
                                type="email"
                                value={entryEmail}
                                onChange={(event) => setEntryEmail(event.target.value)}
                                placeholder="name@example.com"
                                autoComplete="email"
                                disabled={authLoading || authMode !== "email"}
                            />
                        </label>

                        {authMode === "email" && (
                            <div className="button-row">
                                <button
                                    className="primary"
                                    disabled={authLoading || !emailTrimmed}
                                    onClick={() => {
                                        void continueWithEmail();
                                    }}
                                >
                                    {tr(language, "auth.continue")}
                                </button>
                            </div>
                        )}

                        {authMode === "password" && (
                            <>
                                <label>
                                    {tr(language, "settings.accountPassword")}
                                    <input
                                        type="password"
                                        value={entryPassword}
                                        onChange={(event) => setEntryPassword(event.target.value)}
                                        autoComplete="current-password"
                                        disabled={authLoading}
                                    />
                                </label>
                                <div className="button-row">
                                    <button
                                        className="primary"
                                        disabled={authLoading || !emailTrimmed || entryPassword.length < 6}
                                        onClick={() => {
                                            void onSignIn(emailTrimmed, entryPassword);
                                        }}
                                    >
                                        {tr(language, "settings.accountSignIn")}
                                    </button>
                                    <button
                                        disabled={authLoading || !emailTrimmed}
                                        onClick={() => {
                                            void requestCodeAndOpen();
                                        }}
                                    >
                                        {tr(language, "auth.signInWithCode")}
                                    </button>
                                    <button
                                        disabled={authLoading}
                                        onClick={() => resetAuthFlow()}
                                    >
                                        {tr(language, "auth.otherEmail")}
                                    </button>
                                </div>
                            </>
                        )}

                        {authMode === "registerPrompt" && (
                            <>
                                <p className="muted">{tr(language, "auth.noAccountPrompt")}</p>
                                <div className="button-row">
                                    <button className="primary" disabled={authLoading} onClick={() => setAuthMode("register")}>
                                        {tr(language, "auth.register")}
                                    </button>
                                    <button disabled={authLoading} onClick={() => resetAuthFlow()}>
                                        {tr(language, "auth.otherEmail")}
                                    </button>
                                </div>
                            </>
                        )}

                        {authMode === "register" && (
                            <>
                                <label>
                                    {tr(language, "settings.accountPassword")}
                                    <input
                                        type="password"
                                        value={entryPassword}
                                        onChange={(event) => setEntryPassword(event.target.value)}
                                        autoComplete="new-password"
                                        disabled={authLoading}
                                    />
                                </label>
                                <label>
                                    {tr(language, "auth.passwordConfirm")}
                                    <input
                                        type="password"
                                        value={registerConfirm}
                                        onChange={(event) => setRegisterConfirm(event.target.value)}
                                        autoComplete="new-password"
                                        disabled={authLoading}
                                    />
                                </label>
                                <div className="button-row">
                                    <button
                                        className="primary"
                                        disabled={authLoading || !emailTrimmed || entryPassword.length < 6 || entryPassword !== registerConfirm}
                                        onClick={() => {
                                            void onSignUp(emailTrimmed, entryPassword);
                                        }}
                                    >
                                        {tr(language, "auth.createAccount")}
                                    </button>
                                    <button disabled={authLoading} onClick={() => resetAuthFlow()}>
                                        {tr(language, "auth.otherEmail")}
                                    </button>
                                </div>
                            </>
                        )}

                        {authMode === "code" && (
                            <>
                                {!codePrimed && (
                                    <button
                                        className="button"
                                        disabled={authLoading || !emailTrimmed}
                                        onClick={() => {
                                            void requestCodeAndOpen();
                                        }}
                                    >
                                        {tr(language, "auth.sendCode")}
                                    </button>
                                )}
                                <label>
                                    {tr(language, "auth.codeLabel")}
                                    <input
                                        value={codeInput}
                                        onChange={(event) => setCodeInput(event.target.value)}
                                        placeholder="123456"
                                        inputMode="numeric"
                                        autoComplete="one-time-code"
                                        disabled={authLoading}
                                    />
                                </label>
                                <div className="button-row">
                                    <button
                                        className="primary"
                                        disabled={authLoading || !emailTrimmed || !codeInput.trim()}
                                        onClick={() => {
                                            void onVerifyOneTimeCode(emailTrimmed, codeInput.trim());
                                        }}
                                    >
                                        {tr(language, "auth.confirmCode")}
                                    </button>
                                    <button
                                        disabled={authLoading || !emailTrimmed}
                                        onClick={() => {
                                            void onRequestOneTimeCode(emailTrimmed);
                                        }}
                                    >
                                        {tr(language, "auth.resendCode")}
                                    </button>
                                    <button
                                        disabled={authLoading}
                                        onClick={() => setAuthMode("password")}
                                    >
                                        {tr(language, "common.back")}
                                    </button>
                                </div>
                                <p className="hint">{tr(language, "auth.codeHint")}</p>
                                <button
                                    className="button"
                                    disabled={authLoading || !emailTrimmed}
                                    onClick={() => {
                                        void onRequestMagicLink(emailTrimmed);
                                        setLocalAuthHint(tr(language, "auth.magicLinkFallbackHint"));
                                    }}
                                >
                                    {tr(language, "settings.accountMagicLink")}
                                </button>
                            </>
                        )}
                    </div>
                </section>
            )}

            {!awaitingCloudDashboard && isAuthenticated && (
                <>
                    <section className="card">
                        <h2>{tr(language, "empty.newCycleTitle")}</h2>
                        <p className="hint">{tr(language, "settings.accountSignedInAs", { email: cloudEmail ?? "-" })}</p>
                        <div className="grid">
                            <label>
                                {tr(language, "empty.titleOptional")}
                                <input value={titleInput} onChange={(e) => setTitleInput(e.target.value)} placeholder="Q2 Fokus & Gesundheit" />
                            </label>
                            <label>
                                {tr(language, "empty.startDate")}
                                <input type="date" value={startDateInput} onChange={(e) => setStartDateInput(e.target.value)} />
                                <span className="hint">{tr(language, "empty.startDateHint")}</span>
                            </label>
                        </div>
                        <div className="button-row">
                            <button className="primary" onClick={onCreateCycle}>
                                {tr(language, "empty.createCycle")}
                            </button>
                            <button onClick={() => { void onRequestSyncNow(); }}>
                                {tr(language, "settings.syncNow")}
                            </button>
                            <button onClick={() => { void onSignOut(); }}>
                                {tr(language, "settings.accountSignOut")}
                            </button>
                        </div>
                    </section>
                </>
            )}
        </div>
    );
}
