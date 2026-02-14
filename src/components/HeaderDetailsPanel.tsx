import { AppLanguage } from "../types";
import { t as tr } from "../i18n";
import { ProgressRing } from "./ProgressRing";

type HeaderDetailsPanelProps = {
    open: boolean;
    language: AppLanguage;
    onboardingDone: boolean;
    selectedWeek: number;
    weekCompletion: { percent: number; targetCount: number };
    onClose: () => void;
};

export function HeaderDetailsPanel({
    open,
    language,
    onboardingDone,
    selectedWeek,
    weekCompletion,
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

                {onboardingDone && (
                    <div className="details-progress-block">
                        <ProgressRing value={weekCompletion.percent} max={100} size={92} strokeWidth={8} />
                        <div>
                            <strong>{tr(language, "app.headerWeekShort", { week: selectedWeek })}</strong>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
