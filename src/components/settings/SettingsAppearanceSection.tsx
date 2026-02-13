import { AppLanguage } from "../../types";
import { t as tr } from "../../i18n";
import { ToggleSwitch } from "../ToggleSwitch";

type SettingsAppearanceSectionProps = {
    language: AppLanguage;
    darkMode: boolean;
    setDarkMode: (val: boolean) => void;
};

export function SettingsAppearanceSection({
    language,
    darkMode,
    setDarkMode
}: SettingsAppearanceSectionProps) {
    return (
        <div className="settings-section">
            <h3>{tr(language, "common.design")}</h3>
            <div className="settings-row">
                <label>{tr(language, "settings.darkMode")}</label>
                <ToggleSwitch checked={darkMode} onChange={setDarkMode} />
            </div>
        </div>
    );
}
