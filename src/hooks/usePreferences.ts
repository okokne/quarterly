import { useEffect, useState } from "react";
import {
    AppLanguage,
    APP_DARK_MODE_STORAGE_KEY,
    APP_DATE_FORMAT_STORAGE_KEY,
    APP_TIME_FORMAT_STORAGE_KEY,
    DateFormat,
    TimeFormat
} from "../types";
import { APP_LANGUAGE_STORAGE_KEY, detectInitialLanguage, isAppLanguage } from "../i18n";

function readDateFormat(): DateFormat {
    const stored = localStorage.getItem(APP_DATE_FORMAT_STORAGE_KEY);
    if (stored === "eu_short" || stored === "eu_long" || stored === "iso") return stored;
    return "eu_short";
}

function readTimeFormat(): TimeFormat {
    const stored = localStorage.getItem(APP_TIME_FORMAT_STORAGE_KEY);
    if (stored === "24h" || stored === "12h") return stored;
    return "24h";
}

function readLanguage(): AppLanguage {
    const stored = localStorage.getItem(APP_LANGUAGE_STORAGE_KEY);
    if (isAppLanguage(stored)) return stored;
    return detectInitialLanguage();
}

export function usePreferences() {
    const [darkMode, setDarkMode] = useState(() => {
        const stored = localStorage.getItem(APP_DARK_MODE_STORAGE_KEY);
        return stored === "true";
    });
    const [language, setLanguage] = useState<AppLanguage>(readLanguage);
    const [dateFormat, setDateFormat] = useState<DateFormat>(readDateFormat);
    const [timeFormat, setTimeFormat] = useState<TimeFormat>(readTimeFormat);

    useEffect(() => {
        document.body.classList.toggle("dark-mode", darkMode);
        try {
            localStorage.setItem(APP_DARK_MODE_STORAGE_KEY, darkMode.toString());
        } catch (err) {
            console.error("Failed to persist dark mode:", err);
        }
    }, [darkMode]);

    useEffect(() => {
        try {
            localStorage.setItem(APP_DATE_FORMAT_STORAGE_KEY, dateFormat);
        } catch (err) {
            console.error("Failed to persist date format:", err);
        }
    }, [dateFormat]);

    useEffect(() => {
        try {
            localStorage.setItem(APP_TIME_FORMAT_STORAGE_KEY, timeFormat);
        } catch (err) {
            console.error("Failed to persist time format:", err);
        }
    }, [timeFormat]);

    useEffect(() => {
        try {
            localStorage.setItem(APP_LANGUAGE_STORAGE_KEY, language);
        } catch (err) {
            console.error("Failed to persist language:", err);
        }
    }, [language]);

    return {
        darkMode,
        setDarkMode,
        language,
        setLanguage,
        dateFormat,
        setDateFormat,
        timeFormat,
        setTimeFormat
    };
}
