import { AppLanguage } from "../../types";
import { t as tr } from "../../i18n";
import { GoogleCalendar, listCalendars, signIn, signOut } from "../../googleCalendar";

type SettingsGoogleCalendarSectionProps = {
    language: AppLanguage;
    readOnly: boolean;
    googleLoading: boolean;
    googleConnected: boolean;
    calendarList: GoogleCalendar[];
    selectedCalendarId: string;
    setGoogleConnected: (val: boolean) => void;
    setCalendarList: (val: GoogleCalendar[]) => void;
    setSelectedCalendarId: (val: string) => void;
};

export function SettingsGoogleCalendarSection({
    language,
    readOnly,
    googleLoading,
    googleConnected,
    calendarList,
    selectedCalendarId,
    setGoogleConnected,
    setCalendarList,
    setSelectedCalendarId
}: SettingsGoogleCalendarSectionProps) {
    return (
        <>
            <div className="settings-row">
                <label>{tr(language, "settings.googleConnect")}</label>
                {googleLoading ? (
                    <span className="muted">{tr(language, "settings.loading")}</span>
                ) : googleConnected ? (
                    <button
                        className="button"
                        disabled={readOnly}
                        onClick={async () => {
                            signOut();
                            setGoogleConnected(false);
                            setCalendarList([]);
                        }}
                    >
                        {tr(language, "settings.disconnect")}
                    </button>
                ) : (
                    <button
                        className="button"
                        disabled={readOnly}
                        onClick={async () => {
                            try {
                                await signIn();
                                setGoogleConnected(true);
                                const calendars = await listCalendars();
                                setCalendarList(calendars);
                            } catch (error) {
                                console.error("Google sign-in failed:", error);
                            }
                        }}
                    >
                        {tr(language, "settings.connect")}
                    </button>
                )}
            </div>
            {googleConnected && (
                <div className="settings-row">
                    <label>{tr(language, "settings.targetCalendar")}</label>
                    {calendarList.length === 0 ? (
                        <button
                            className="button"
                            disabled={readOnly}
                            onClick={async () => {
                                const calendars = await listCalendars();
                                setCalendarList(calendars);
                            }}
                        >
                            {tr(language, "settings.loadCalendars")}
                        </button>
                    ) : (
                        <select
                            value={selectedCalendarId}
                            disabled={readOnly}
                            onChange={(event) => {
                                setSelectedCalendarId(event.target.value);
                            }}
                            className="settings-select"
                        >
                            {calendarList.map((calendar) => (
                                <option key={calendar.id} value={calendar.id}>
                                    {calendar.summary} {calendar.primary ? tr(language, "settings.primaryCalendar") : ""}
                                </option>
                            ))}
                        </select>
                    )}
                </div>
            )}
        </>
    );
}
