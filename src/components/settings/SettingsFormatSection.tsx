import { AppLanguage, DateFormat, TimeFormat } from "../../types";
import { t as tr } from "../../i18n";

type SettingsFormatSectionProps = {
    language: AppLanguage;
    dateFormat: DateFormat;
    timeFormat: TimeFormat;
    setLanguage: (val: AppLanguage) => void;
    setDateFormat: (val: DateFormat) => void;
    setTimeFormat: (val: TimeFormat) => void;
};

export function SettingsFormatSection({
    language,
    dateFormat,
    timeFormat,
    setLanguage,
    setDateFormat,
    setTimeFormat
}: SettingsFormatSectionProps) {
    return (
        <div className="settings-section">
            <h3>{tr(language, "common.format")}</h3>
            <div className="settings-row">
                <label>{tr(language, "common.language")}</label>
                <select
                    value={language}
                    onChange={(event) => setLanguage(event.target.value as AppLanguage)}
                    className="settings-select"
                >
                    <option value="de">{tr(language, "common.german")}</option>
                    <option value="en">{tr(language, "common.english")}</option>
                </select>
            </div>
            <div className="settings-row">
                <label>{tr(language, "settings.dateFormat")}</label>
                <select
                    value={dateFormat}
                    onChange={(event) => setDateFormat(event.target.value as DateFormat)}
                    className="settings-select"
                >
                    <option value="eu_short">DD.MM.YYYY</option>
                    <option value="eu_long">DD. MMMM YYYY</option>
                    <option value="iso">YYYY-MM-DD</option>
                </select>
            </div>
            <div className="settings-row">
                <label>{tr(language, "settings.timeFormat")}</label>
                <select
                    value={timeFormat}
                    onChange={(event) => setTimeFormat(event.target.value as TimeFormat)}
                    className="settings-select"
                >
                    <option value="24h">24h</option>
                    <option value="12h">12h AM/PM</option>
                </select>
            </div>
        </div>
    );
}
