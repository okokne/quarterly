import { AppLanguage, Cycle, DateFormat, Id } from "../../types";
import { t as tr } from "../../i18n";
import { formatDate } from "../../utils";

type CycleArchiveSectionProps = {
    language: AppLanguage;
    dateFormat: DateFormat;
    history: Cycle[];
    readOnly: boolean;
    onViewCycle: (id: Id) => void;
    onDeleteCycle: (id: Id) => void;
};

export function CycleArchiveSection({
    language,
    dateFormat,
    history,
    readOnly,
    onViewCycle,
    onDeleteCycle
}: CycleArchiveSectionProps) {
    return (
        <section className="cycle-section">
            <h3>{tr(language, "common.archive")}</h3>
            {history.length === 0 && <p className="muted">{tr(language, "settings.noArchive")}</p>}
            {history.length > 0 && (
                <div className="list">
                    {history.map((entry) => (
                        <div key={entry.id} className="settings-row">
                            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                                <strong>{entry.title || tr(language, "settings.untitled")}</strong>
                                <span className="muted">{formatDate(entry.startDate, dateFormat, language)}</span>
                                {entry.finalReview && (
                                    <span className="muted">{tr(language, "cycle.reviewTitle")}</span>
                                )}
                            </div>
                            <div className="button-row compact">
                                <button className="button" onClick={() => onViewCycle(entry.id)}>{tr(language, "common.view")}</button>
                                <button className="button ghost-danger" disabled={readOnly} onClick={() => onDeleteCycle(entry.id)}>
                                    {tr(language, "common.delete")}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}
