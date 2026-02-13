import { AppLanguage, Cycle, DateFormat, Id } from "../types";
import { t as tr } from "../i18n";
import { CycleOverviewSection } from "./cycle/CycleOverviewSection";
import { CycleVisionSection } from "./cycle/CycleVisionSection";
import { CycleArchiveSection } from "./cycle/CycleArchiveSection";
import { CycleFinalReviewFlow } from "./cycle/CycleFinalReviewFlow";

type CycleDrawerProps = {
    open: boolean;
    language: AppLanguage;
    dateFormat: DateFormat;
    cycle: Cycle | null;
    history: Cycle[];
    readOnly: boolean;
    updateCycle: (updater: (prev: Cycle) => Cycle) => void;
    onArchiveRestart: () => void;
    onViewArchivedCycle: (id: Id) => void;
    onDeleteArchivedCycle: (id: Id) => void;
    onClose: () => void;
};

export function CycleDrawer({
    open,
    language,
    dateFormat,
    cycle,
    history,
    readOnly,
    updateCycle,
    onArchiveRestart,
    onViewArchivedCycle,
    onDeleteArchivedCycle,
    onClose
}: CycleDrawerProps) {
    if (!open || !cycle) return null;

    return (
        <div className="overlay-backdrop" onClick={onClose}>
            <aside className="overlay-card cycle-drawer" onClick={(event) => event.stopPropagation()}>
                <div className="overlay-header">
                    <h3>{tr(language, "cycle.drawerTitle")}</h3>
                    <button className="icon-btn" onClick={onClose} aria-label={tr(language, "common.close")}>✕</button>
                </div>

                <CycleOverviewSection
                    cycle={cycle}
                    language={language}
                    dateFormat={dateFormat}
                    readOnly={readOnly}
                    onArchiveRestart={onArchiveRestart}
                />

                <CycleVisionSection
                    cycle={cycle}
                    language={language}
                    readOnly={readOnly}
                    updateCycle={updateCycle}
                />

                <CycleFinalReviewFlow
                    cycle={cycle}
                    language={language}
                    readOnly={readOnly}
                    updateCycle={updateCycle}
                />

                <CycleArchiveSection
                    language={language}
                    dateFormat={dateFormat}
                    history={history}
                    readOnly={readOnly}
                    onViewCycle={onViewArchivedCycle}
                    onDeleteCycle={onDeleteArchivedCycle}
                />
            </aside>
        </div>
    );
}
