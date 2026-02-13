import { useEffect, useState } from "react";
import {
    AppLanguage,
    APP_DARK_MODE_STORAGE_KEY,
    APP_DATE_FORMAT_STORAGE_KEY,
    APP_TIME_FORMAT_STORAGE_KEY,
    DateFormat,
    TimeFormat,
    StorageScope
} from "../types";
import { APP_LANGUAGE_STORAGE_KEY, detectInitialLanguage, isAppLanguage } from "../i18n";
import { readScopedStorageValue, writeScopedStorageValue } from "../persistence/storageScope";

function readDateFormat(scope: StorageScope): DateFormat {
    const stored = readScopedStorageValue(APP_DATE_FORMAT_STORAGE_KEY, scope);
    if (stored === "eu_short" || stored === "eu_long" || stored === "iso") return stored;
    return "eu_short";
}

function readTimeFormat(scope: StorageScope): TimeFormat {
    const stored = readScopedStorageValue(APP_TIME_FORMAT_STORAGE_KEY, scope);
    if (stored === "24h" || stored === "12h") return stored;
    return "24h";
}

function readLanguage(scope: StorageScope): AppLanguage {
    const stored = readScopedStorageValue(APP_LANGUAGE_STORAGE_KEY, scope);
    if (isAppLanguage(stored)) return stored;
    return detectInitialLanguage();
}

type UsePreferencesParams = {
    storageScope: StorageScope;
};

export function usePreferences({ storageScope }: UsePreferencesParams) {
    const [darkMode, setDarkMode] = useState(() => {
        const stored = readScopedStorageValue(APP_DARK_MODE_STORAGE_KEY, storageScope);
        return stored === "true";
    });
    const [language, setLanguage] = useState<AppLanguage>(() => readLanguage(storageScope));
    const [dateFormat, setDateFormat] = useState<DateFormat>(() => readDateFormat(storageScope));
    const [timeFormat, setTimeFormat] = useState<TimeFormat>(() => readTimeFormat(storageScope));

    useEffect(() => {
        document.body.classList.toggle("dark-mode", darkMode);
        try {
            writeScopedStorageValue(APP_DARK_MODE_STORAGE_KEY, storageScope, darkMode.toString());
        } catch (err) {
            console.error("Failed to persist dark mode:", err);
        }
    }, [darkMode, storageScope]);

    useEffect(() => {
        try {
            writeScopedStorageValue(APP_DATE_FORMAT_STORAGE_KEY, storageScope, dateFormat);
        } catch (err) {
            console.error("Failed to persist date format:", err);
        }
    }, [dateFormat, storageScope]);

    useEffect(() => {
        try {
            writeScopedStorageValue(APP_TIME_FORMAT_STORAGE_KEY, storageScope, timeFormat);
        } catch (err) {
            console.error("Failed to persist time format:", err);
        }
    }, [timeFormat, storageScope]);

    useEffect(() => {
        try {
            writeScopedStorageValue(APP_LANGUAGE_STORAGE_KEY, storageScope, language);
        } catch (err) {
            console.error("Failed to persist language:", err);
        }
    }, [language, storageScope]);

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
