import { useEffect, useState } from "react";
import { GoogleCalendar, initGoogleApi, initGoogleIdentity, isSignedIn, listCalendars } from "../googleCalendar";
import { CALENDAR_ID_STORAGE_KEY, StorageScope } from "../types";
import { readScopedStorageValue } from "../persistence/storageScope";

type UseGoogleCalendarSetupParams = {
    storageScope: StorageScope;
};

export function useGoogleCalendarSetup({ storageScope }: UseGoogleCalendarSetupParams) {
    const [googleLoading, setGoogleLoading] = useState(true);
    const [googleConnected, setGoogleConnected] = useState(false);
    const [calendarList, setCalendarList] = useState<GoogleCalendar[]>([]);
    const [selectedCalendarId, setSelectedCalendarId] = useState(() => {
        return readScopedStorageValue(CALENDAR_ID_STORAGE_KEY, storageScope) || "primary";
    });

    useEffect(() => {
        const loadScript = (src: string) => {
            const id = src.includes("api.js") ? "gapi-script" : "gsi-script";
            if (document.getElementById(id)) return Promise.resolve(true);

            return new Promise((resolve, reject) => {
                const script = document.createElement("script");
                script.src = src;
                script.id = id;
                script.async = true;
                script.defer = true;
                script.onload = () => resolve(true);
                script.onerror = () => reject(new Error(`Failed to load ${src}`));
                document.body.appendChild(script);
            });
        };

        const init = async () => {
            try {
                await loadScript("https://accounts.google.com/gsi/client");

                let attempts = 0;
                while (typeof (window as any).google === "undefined" && attempts < 50) {
                    await new Promise((r) => setTimeout(r, 100));
                    attempts += 1;
                }
                if (typeof (window as any).google === "undefined") {
                    throw new Error("Timeout waiting for window.google");
                }
                initGoogleIdentity();

                await loadScript("https://apis.google.com/js/api.js");
                attempts = 0;
                while (typeof (window as any).gapi === "undefined" && attempts < 50) {
                    await new Promise((r) => setTimeout(r, 100));
                    attempts += 1;
                }
                if (typeof (window as any).gapi === "undefined") {
                    throw new Error("Timeout waiting for window.gapi");
                }
                await initGoogleApi();

                const connected = isSignedIn();
                setGoogleConnected(connected);
                if (connected) {
                    const calendars = await listCalendars();
                    setCalendarList(calendars);
                }
            } catch (err) {
                console.error("Google Calendar init failed:", err);
            } finally {
                setGoogleLoading(false);
            }
        };

        init();
    }, []);

    return {
        googleLoading,
        googleConnected,
        setGoogleConnected,
        calendarList,
        setCalendarList,
        selectedCalendarId,
        setSelectedCalendarId
    };
}
