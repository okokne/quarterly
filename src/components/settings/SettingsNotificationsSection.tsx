import { AppLanguage } from "../../types";
import { t as tr } from "../../i18n";

type SettingsNotificationsSectionProps = {
    language: AppLanguage;
    readOnly: boolean;
    onRequestNotifications: () => void;
};

export function SettingsNotificationsSection({
    language,
    readOnly,
    onRequestNotifications
}: SettingsNotificationsSectionProps) {
    return (
        <div className="settings-section">
            <h3>{tr(language, "common.notifications")}</h3>
            <div className="settings-row">
                <label>{tr(language, "settings.weeklyReminder")}</label>
                <button className="button" disabled={readOnly} onClick={onRequestNotifications}>{tr(language, "settings.enable")}</button>
            </div>
        </div>
    );
}
