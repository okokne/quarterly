import type { Dispatch, SetStateAction } from "react";
import { AppLanguage } from "../types";
import { t as tr } from "../i18n";

export type EntryScreen = "welcome" | "auth" | "tour" | "new";

type AppEntryStateProps = {
    language: AppLanguage;
    awaitingCloudDashboard: boolean;
    entryScreen: EntryScreen;
    setEntryScreen: (screen: EntryScreen) => void;
    entryTourStep: number;
    setEntryTourStep: Dispatch<SetStateAction<number>>;
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
    onRequestMagicLink: (email: string) => Promise<boolean>;
    onCreateCycle: () => void;
    onLoadDemo: () => void;
};

export function AppEntryState({
    language,
    awaitingCloudDashboard,
    entryScreen,
    setEntryScreen,
    entryTourStep,
    setEntryTourStep,
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
    onRequestMagicLink,
    onCreateCycle,
    onLoadDemo
}: AppEntryStateProps) {
    const tourSlides = [
        {
            title: tr(language, "welcome.tourWhatTitle"),
            body: tr(language, "welcome.tourWhatBody")
        },
        {
            title: tr(language, "welcome.tourWhyTitle"),
            body: tr(language, "welcome.tourWhyBody")
        },
        {
            title: tr(language, "welcome.tourHowTitle"),
            body: tr(language, "welcome.tourHowBody")
        }
    ];

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
                    <h2>Cloud-Daten werden geladen</h2>
                    <p className="muted">Du bist eingeloggt. Wir stellen dein Dashboard aus der Cloud wieder her.</p>
                </section>
            )}

            {!awaitingCloudDashboard && entryScreen === "welcome" && (
                <section className="card">
                    <h2>{tr(language, "welcome.title")}</h2>
                    <p className="muted">{tr(language, "welcome.subtitle")}</p>
                    <div className="button-row">
                        <button className="primary" onClick={() => setEntryScreen("new")}>{tr(language, "welcome.newStart")}</button>
                        <button
                            onClick={async () => {
                                if (isAuthenticated) {
                                    await onRequestSyncNow();
                                    setEntryScreen("new");
                                    return;
                                }
                                setEntryScreen("auth");
                            }}
                        >
                            {tr(language, "welcome.login")}
                        </button>
                        <button onClick={() => setEntryScreen("tour")}>{tr(language, "welcome.tour")}</button>
                    </div>
                </section>
            )}

            {!awaitingCloudDashboard && entryScreen === "auth" && (
                <section className="card">
                    <h2>{tr(language, "welcome.authTitle")}</h2>
                    {!syncEnabled && (
                        <p className="warning-text">{tr(language, "settings.syncDisabledHint")}</p>
                    )}
                    <p className="muted">{tr(language, "welcome.authSubtitle")}</p>
                    {authError && <p className="error-text">{authError}</p>}
                    {syncError && <p className="error-text">{syncError}</p>}
                    {authMessage && <p className="hint">{authMessage}</p>}
                    {isAuthenticated && cloudEmail && <p className="hint">{tr(language, "settings.accountSignedInAs", { email: cloudEmail })}</p>}
                    {isAuthenticated ? (
                        <div className="button-row">
                            <button className="primary" disabled={authLoading} onClick={async () => {
                                await onRequestSyncNow();
                                setEntryScreen("new");
                            }}>
                                {tr(language, "welcome.login")}
                            </button>
                            <button disabled={authLoading} onClick={() => {
                                void onSignOut();
                            }}>
                                {tr(language, "settings.accountSignOut")}
                            </button>
                            <button onClick={() => setEntryScreen("welcome")}>{tr(language, "common.back")}</button>
                        </div>
                    ) : (
                        <>
                            <div className="grid">
                                <label>
                                    {tr(language, "settings.accountEmail")}
                                    <input
                                        type="email"
                                        value={entryEmail}
                                        onChange={(e) => setEntryEmail(e.target.value)}
                                        placeholder="name@example.com"
                                    />
                                </label>
                                <label>
                                    {tr(language, "settings.accountPassword")}
                                    <input
                                        type="password"
                                        value={entryPassword}
                                        onChange={(e) => setEntryPassword(e.target.value)}
                                    />
                                </label>
                            </div>
                            <div className="button-row">
                                <button className="primary" disabled={authLoading || !entryEmail || entryPassword.length < 6} onClick={async () => {
                                    const ok = await onSignIn(entryEmail, entryPassword);
                                    if (ok) setEntryScreen("new");
                                }}>
                                    {tr(language, "settings.accountSignIn")}
                                </button>
                                <button disabled={authLoading || !entryEmail || entryPassword.length < 6} onClick={async () => {
                                    const ok = await onSignUp(entryEmail, entryPassword);
                                    if (ok) setEntryScreen("new");
                                }}>
                                    {tr(language, "settings.accountCreate")}
                                </button>
                                <button disabled={authLoading || !entryEmail} onClick={() => {
                                    void onRequestMagicLink(entryEmail);
                                }}>
                                    {tr(language, "settings.accountMagicLink")}
                                </button>
                                <button onClick={() => setEntryScreen("welcome")}>{tr(language, "common.back")}</button>
                            </div>
                        </>
                    )}
                    {magicLinkRedirectUrl && (
                        <p className="hint">{tr(language, "settings.accountMagicRedirect", { url: magicLinkRedirectUrl })}</p>
                    )}
                    {magicLinkRedirectError && <p className="error-text">{magicLinkRedirectError}</p>}
                </section>
            )}

            {!awaitingCloudDashboard && entryScreen === "tour" && (
                <section className="card">
                    <h2>{tourSlides[entryTourStep]?.title}</h2>
                    <p>{tourSlides[entryTourStep]?.body}</p>
                    <div className="button-row">
                        <button onClick={() => setEntryScreen("welcome")}>{tr(language, "common.back")}</button>
                        {entryTourStep > 0 && (
                            <button onClick={() => setEntryTourStep((prev) => Math.max(0, prev - 1))}>{tr(language, "welcome.prev")}</button>
                        )}
                        {entryTourStep < tourSlides.length - 1 ? (
                            <button className="primary" onClick={() => setEntryTourStep((prev) => Math.min(tourSlides.length - 1, prev + 1))}>{tr(language, "common.next")}</button>
                        ) : (
                            <button className="primary" onClick={() => {
                                setEntryTourStep(0);
                                setEntryScreen("new");
                            }}>{tr(language, "common.done")}</button>
                        )}
                    </div>
                </section>
            )}

            {!awaitingCloudDashboard && entryScreen === "new" && (
                <>
                    <section className="card">
                        <h2>{tr(language, "empty.newCycleTitle")}</h2>
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
                            <button onClick={() => setEntryScreen("welcome")}>{tr(language, "common.back")}</button>
                        </div>
                    </section>

                    <section className="card">
                        <h2>{tr(language, "empty.demoTitle")}</h2>
                        <p>{tr(language, "empty.demoDescription")}</p>
                        <button onClick={onLoadDemo}>{tr(language, "empty.loadDemo")}</button>
                    </section>
                </>
            )}
        </div>
    );
}
