import { AppLanguage, Cycle, DateFormat, Id } from "../../types";
import { Trash2 } from "lucide-react";
import { t as tr } from "../../i18n";
import { formatDate } from "../../utils";
import { Icon } from "../ui/Icon";

type SettingsArchiveSectionProps = {
    language: AppLanguage;
    history: Cycle[];
    dateFormat: DateFormat;
    readOnly: boolean;
    setViewingArchiveId: (id: Id | null) => void;
    setShowSettings: (val: boolean) => void;
    setShowArchiveDeleteConfirm: (id: Id | null) => void;
};

export function SettingsArchiveSection({
    language,
    history,
    dateFormat,
    readOnly,
    setViewingArchiveId,
    setShowSettings,
    setShowArchiveDeleteConfirm
}: SettingsArchiveSectionProps) {
    return (
        <div className="settings-section">
            <h3>{tr(language, "common.archive")}</h3>
            {history.length === 0 ? (
                <p className="muted" style={{ padding: "0 8px" }}>{tr(language, "settings.noArchive")}</p>
            ) : (
                <div className="list" style={{ gap: "8px" }}>
                    {history.map((cycle) => (
                        <div key={cycle.id} className="settings-row">
                            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                                <strong>{cycle.title || tr(language, "settings.untitled")}</strong>
                                <span className="muted" style={{ fontSize: "0.8rem" }}>
                                    {cycle.startDate ? formatDate(cycle.startDate, dateFormat, language) : ""}
                                </span>
                            </div>
                            <div style={{ display: "flex", gap: "8px" }}>
                                <button className="button" onClick={() => {
                                    setViewingArchiveId(cycle.id);
                                    setShowSettings(false);
                                }}>{tr(language, "common.view")}</button>
                                <button className="button ghost-danger" disabled={readOnly} onClick={() => {
                                    setShowArchiveDeleteConfirm(cycle.id);
                                }} aria-label={tr(language, "common.delete")} title={tr(language, "common.delete")}>
                                    <Icon icon={Trash2} size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
