import { AppLanguage } from "../../types";
import { t as tr } from "../../i18n";

type SettingsDataSectionProps = {
    language: AppLanguage;
    readOnly: boolean;
    setShowSettings: (val: boolean) => void;
    setShowDemoConfirm: (val: boolean) => void;
    setShowDeleteConfirm: (val: boolean) => void;
};

export function SettingsDataSection({
    language,
    readOnly,
    setShowSettings,
    setShowDemoConfirm,
    setShowDeleteConfirm
}: SettingsDataSectionProps) {
    return (
        <div className="settings-section">
            <h3>{tr(language, "common.data")}</h3>
            <div className="settings-row">
                <label>{tr(language, "settings.loadDemo")}</label>
                <button className="button" disabled={readOnly} onClick={() => {
                    setShowSettings(false);
                    setShowDemoConfirm(true);
                }}>{tr(language, "settings.loadDemo")}</button>
            </div>
            <div className="settings-row">
                <label>{tr(language, "settings.completeCycle")}</label>
                <button className="button" disabled={readOnly} onClick={() => {
                    setShowSettings(false);
                    setShowDeleteConfirm(true);
                }}>
                    {tr(language, "settings.archiveRestart")}
                </button>
            </div>
        </div>
    );
}
