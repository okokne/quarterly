import { useEffect, useMemo, useState } from "react";
import { AppLanguage } from "../types";
import { t as tr } from "../i18n";

type AuthMode = "email" | "password" | "register";

type AppEntryStateProps = {
    language: AppLanguage;
    awaitingCloudDashboard: boolean;
    syncEnabled: boolean;
    isAuthenticated: boolean;
    cloudEmail: string | null;
    authError: string | null;
    syncError: string | null;
    authMessage: string | null;
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
    onRequestMagicLink,
    onCreateCycle
}: AppEntryStateProps) {
    const [authMode, setAuthMode] = useState<AuthMode>("email");
    const [registerConfirm, setRegisterConfirm] = useState("");
    const [localAuthHint, setLocalAuthHint] = useState<string | null>(null);
    const [magicLinkWasSent, setMagicLinkWasSent] = useState(false);
    const [magicLinkCooldownUntil, setMagicLinkCooldownUntil] = useState<number | null>(null);
    const [clockTick, setClockTick] = useState(() => Date.now());
    const [showRegisterHint, setShowRegisterHint] = useState(false);
    const emailTrimmed = useMemo(() => entryEmail.trim(), [entryEmail]);
    const magicLinkSecondsLeft = useMemo(() => {
        if (!magicLinkCooldownUntil) return 0;
        return Math.max(0, Math.ceil((magicLinkCooldownUntil - clockTick) / 1000));
    }, [clockTick, magicLinkCooldownUntil]);

    useEffect(() => {
        if (!magicLinkCooldownUntil) return;
        const intervalId = window.setInterval(() => {
            setClockTick(Date.now());
        }, 1000);
        return () => window.clearInterval(intervalId);
    }, [magicLinkCooldownUntil]);

    useEffect(() => {
        if (magicLinkCooldownUntil && magicLinkSecondsLeft <= 0) {
            setMagicLinkCooldownUntil(null);
        }
    }, [magicLinkCooldownUntil, magicLinkSecondsLeft]);

    const resetAuthFlow = () => {
        setAuthMode("email");
        setEntryPassword("");
        setRegisterConfirm("");
        setLocalAuthHint(null);
        setShowRegisterHint(false);
        setMagicLinkWasSent(false);
        setMagicLinkCooldownUntil(null);
    };

    const startSignInFlow = () => {
        if (!emailTrimmed) return;
        setLocalAuthHint(null);
        setShowRegisterHint(false);
        setMagicLinkWasSent(false);
        setMagicLinkCooldownUntil(null);
        setAuthMode("password");
    };

    const startRegisterFlow = () => {
        if (!emailTrimmed) return;
        setLocalAuthHint(null);
        setShowRegisterHint(false);
        setMagicLinkWasSent(false);
        setMagicLinkCooldownUntil(null);
        setEntryPassword("");
        setRegisterConfirm("");
        setAuthMode("register");
    };

    const signInWithPassword = async () => {
        if (!emailTrimmed || !entryPassword.trim()) return;
        setShowRegisterHint(false);
        const ok = await onSignIn(emailTrimmed, entryPassword);
        if (!ok) {
            setShowRegisterHint(true);
            setLocalAuthHint(tr(language, "auth.signInFailedRegisterHint"));
        }
    };

    const requestPasswordlessSignIn = async () => {
        if (!emailTrimmed) return;
        if (magicLinkSecondsLeft > 0) return;
        const ok = await onRequestMagicLink(emailTrimmed);
        if (!ok) return;
        setMagicLinkWasSent(true);
        setMagicLinkCooldownUntil(Date.now() + 60_000);
        setLocalAuthHint(tr(language, "auth.magicLinkCheckInboxHint"));
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
                <section className="card auth-entry-card">
                    <div className="auth-entry-layout">
                        <div className="auth-entry-intro">
                            <h2>{tr(language, "auth.entryTitle")}</h2>
                            <p className="muted">{tr(language, "auth.entrySubtitle")}</p>
                        </div>
                        <div className="auth-entry-main">
                            {!syncEnabled && (
                                <p className="warning-text">{tr(language, "settings.syncDisabledHint")}</p>
                            )}
                            <div className="auth-entry-feedback">
                                {authError && <p className="error-text">{authError}</p>}
                                {syncError && <p className="error-text">{syncError}</p>}
                                {authMessage && <p className="hint">{authMessage}</p>}
                                {localAuthHint && <p className="hint">{localAuthHint}</p>}
                                {magicLinkRedirectError && <p className="error-text">{magicLinkRedirectError}</p>}
                            </div>

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
                                    <div className="button-row auth-entry-actions">
                                        <button
                                            className="primary"
                                            disabled={authLoading || !emailTrimmed}
                                            onClick={() => {
                                                startSignInFlow();
                                            }}
                                        >
                                            {tr(language, "settings.accountSignIn")}
                                        </button>
                                        <button
                                            disabled={authLoading || !emailTrimmed}
                                            onClick={() => {
                                                startRegisterFlow();
                                            }}
                                        >
                                            {tr(language, "auth.register")}
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
                                        <div className="button-row auth-entry-actions">
                                            <button
                                                className="primary"
                                                disabled={authLoading || !emailTrimmed || !entryPassword.trim()}
                                                onClick={() => {
                                                    void signInWithPassword();
                                                }}
                                            >
                                                {tr(language, "settings.accountSignIn")}
                                            </button>
                                            <button
                                                disabled={authLoading || !emailTrimmed || magicLinkSecondsLeft > 0}
                                                onClick={() => {
                                                    void requestPasswordlessSignIn();
                                                }}
                                            >
                                                {magicLinkWasSent
                                                    ? (magicLinkSecondsLeft > 0
                                                        ? tr(language, "auth.magicLinkResendIn", { seconds: magicLinkSecondsLeft })
                                                        : tr(language, "auth.magicLinkResendNow"))
                                                    : tr(language, "auth.signInWithoutPassword")}
                                            </button>
                                            <button
                                                disabled={authLoading}
                                                onClick={() => resetAuthFlow()}
                                            >
                                                {tr(language, "common.back")}
                                            </button>
                                        </div>
                                        {magicLinkWasSent && (
                                            <p className="auth-entry-support">
                                                {tr(language, "auth.magicLinkCheckInboxHint")}
                                            </p>
                                        )}
                                        {showRegisterHint && (
                                            <div className="auth-entry-register-hint">
                                                <p className="muted">{tr(language, "auth.noAccountPrompt")}</p>
                                                <button
                                                    disabled={authLoading}
                                                    onClick={() => {
                                                        setRegisterConfirm("");
                                                        setAuthMode("register");
                                                    }}
                                                >
                                                    {tr(language, "auth.register")}
                                                </button>
                                            </div>
                                        )}
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
                                        <div className="button-row auth-entry-actions">
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
                                                {tr(language, "common.back")}
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
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
