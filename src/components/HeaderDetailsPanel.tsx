import { AppLanguage } from "../types";
import { t as tr } from "../i18n";
import { ProgressRing } from "./ProgressRing";

type HeaderDetailsPanelProps = {
    open: boolean;
    language: AppLanguage;
    onboardingDone: boolean;
    selectedWeek: number;
    weekCompletion: { done: number; total: number };
    canUndo: boolean;
    canRedo: boolean;
    onUndo: () => void;
    onRedo: () => void;
    onClose: () => void;
};

export function HeaderDetailsPanel({
    open,
    language,
    onboardingDone,
    selectedWeek,
    weekCompletion,
    canUndo,
    canRedo,
    onUndo,
    onRedo,
    onClose
}: HeaderDetailsPanelProps) {
    if (!open) return null;

    return (
        <div className="overlay-backdrop" onClick={onClose}>
            <div className="overlay-card details-overlay-card" onClick={(event) => event.stopPropagation()}>
                <div className="overlay-header">
                    <h3>{tr(language, "app.detailsTitle")}</h3>
                    <button className="icon-btn" onClick={onClose} aria-label={tr(language, "common.close")}>✕</button>
                </div>

                {onboardingDone && weekCompletion.total > 0 && (
                    <div className="details-progress-block">
                        <ProgressRing value={weekCompletion.done} max={weekCompletion.total} size={92} strokeWidth={8} />
                        <div>
                            <strong>{tr(language, "app.headerWeekShort", { week: selectedWeek })}</strong>
                            <p className="muted">{weekCompletion.done}/{weekCompletion.total}</p>
                        </div>
                    </div>
                )}

                <div className="button-row">
                    <button onClick={onUndo} disabled={!canUndo}>
                        {tr(language, "app.undo")}
                    </button>
                    <button onClick={onRedo} disabled={!canRedo}>
                        {tr(language, "app.redo")}
                    </button>
                </div>
            </div>
        </div>
    );
}
