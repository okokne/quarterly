import { AppLanguage, Cycle, DateFormat } from "../../types";
import { t as tr } from "../../i18n";
import { addDays, formatDate } from "../../utils";

type CycleOverviewSectionProps = {
    cycle: Cycle;
    language: AppLanguage;
    dateFormat: DateFormat;
    readOnly: boolean;
    onArchiveRestart: () => void;
};

export function CycleOverviewSection({
    cycle,
    language,
    dateFormat,
    readOnly,
    onArchiveRestart
}: CycleOverviewSectionProps) {
    return (
        <section className="cycle-section">
            <h3>{tr(language, "cycle.overviewTitle")}</h3>
            <p className="muted">
                {tr(language, "cycle.overviewRange", {
                    start: formatDate(cycle.startDate, dateFormat, language),
                    end: formatDate(addDays(cycle.startDate, 83), dateFormat, language)
                })}
            </p>
            <div className="cycle-overview-grid">
                <div className="cycle-overview-item">
                    <span className="muted">{tr(language, "common.targetPlural")}</span>
                    <strong>{cycle.goals.length}</strong>
                </div>
                <div className="cycle-overview-item">
                    <span className="muted">{tr(language, "common.habits")}</span>
                    <strong>{cycle.habits.length}</strong>
                </div>
                <div className="cycle-overview-item">
                    <span className="muted">{tr(language, "common.weeks")}</span>
                    <strong>{cycle.weeks.length}</strong>
                </div>
            </div>

            <div className="button-row">
                <button disabled={readOnly} className="button" onClick={onArchiveRestart}>
                    {tr(language, "settings.archiveRestart")}
                </button>
            </div>
        </section>
    );
}
