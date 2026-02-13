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
    const registerPasswordRules = useMemo(() => {
        const hasMinLength = entryPassword.length >= 10;
        const hasUpperCase = /[A-Z]/.test(entryPassword);
        const hasLowerCase = /[a-z]/.test(entryPassword);
        return {
            hasMinLength,
            hasUpperCase,
            hasLowerCase,
            isValid: hasMinLength && hasUpperCase && hasLowerCase
        };
    }, [entryPassword]);
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

    const submitRegistration = async () => {
        if (!emailTrimmed || !registerPasswordRules.isValid || entryPassword !== registerConfirm) return;
        const ok = await onSignUp(emailTrimmed, entryPassword);
        if (!ok) return;
        // After successful registration (or email-confirmation success), return to sign-in view.
        setRegisterConfirm("");
        setEntryPassword("");
        setShowRegisterHint(false);
        setMagicLinkWasSent(false);
        setMagicLinkCooldownUntil(null);
        setAuthMode("password");
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
                                {authMessage && <p className="success-text">{authMessage}</p>}
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
                                        <div className="auth-password-rules">
                                            <p className="hint">{tr(language, "auth.passwordRulesInfo")}</p>
                                            <p className={`auth-password-rule ${registerPasswordRules.hasMinLength ? "met" : "unmet"}`}>
                                                {tr(language, "auth.passwordRuleMinLength")}
                                            </p>
                                            <p className={`auth-password-rule ${registerPasswordRules.hasUpperCase ? "met" : "unmet"}`}>
                                                {tr(language, "auth.passwordRuleUppercase")}
                                            </p>
                                            <p className={`auth-password-rule ${registerPasswordRules.hasLowerCase ? "met" : "unmet"}`}>
                                                {tr(language, "auth.passwordRuleLowercase")}
                                            </p>
                                        </div>
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
                                                disabled={authLoading || !emailTrimmed || !registerPasswordRules.isValid || entryPassword !== registerConfirm}
                                                onClick={() => {
                                                    void submitRegistration();
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
                    <section className="card auth-cycle-setup-card">
                        <button
                            className="auth-cycle-signout-button"
                            onClick={() => { void onSignOut(); }}
                            title={tr(language, "settings.accountSignOut")}
                            aria-label={tr(language, "settings.accountSignOut")}
                        >
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4" />
                                <path d="M14 8l6 4-6 4" />
                                <path d="M20 12H10" />
                            </svg>
                        </button>
                        <h2>{tr(language, "empty.newCycleTitle")}</h2>
                        <p className="hint">{tr(language, "settings.accountSignedInAs", { email: cloudEmail ?? "-" })}</p>
                        <p className="hint">{tr(language, "empty.firstCycleHint")}</p>
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
                        </div>
                    </section>
                </>
            )}
        </div>
    );
}
