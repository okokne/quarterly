import { AppLanguage, Cycle } from "../../types";
import { t as tr } from "../../i18n";

type CycleVisionSectionProps = {
    cycle: Cycle;
    language: AppLanguage;
    readOnly: boolean;
    updateCycle: (updater: (prev: Cycle) => Cycle) => void;
    compact?: boolean;
    editing?: boolean;
    setEditing?: (editing: boolean) => void;
};

export function CycleVisionSection({
    cycle,
    language,
    readOnly,
    updateCycle,
    compact = false,
    editing = true,
    setEditing
}: CycleVisionSectionProps) {
    const preview = cycle.vision.trim();
    const shortPreview = preview.length > 180 ? `${preview.slice(0, 180)}…` : preview;

    return (
        <section className="cycle-section">
            <h3>{tr(language, "cycle.visionTitle")}</h3>
            {compact && !editing ? (
                <>
                    <p className="muted">{shortPreview || tr(language, "cycle.noVision")}</p>
                    <div className="button-row">
                        <button className="button" disabled={readOnly} onClick={() => setEditing?.(true)}>
                            {tr(language, "cycle.editVision")}
                        </button>
                    </div>
                </>
            ) : (
                <label>
                    {tr(language, "cycle.visionLabel")}
                    <textarea
                        disabled={readOnly}
                        value={cycle.vision}
                        onChange={(event) => {
                            const next = event.target.value;
                            updateCycle((prev) => ({ ...prev, vision: next }));
                        }}
                    />
                    {compact && (
                        <div className="button-row">
                            <button className="button" onClick={() => setEditing?.(false)}>
                                {tr(language, "common.done")}
                            </button>
                        </div>
                    )}
                </label>
            )}
        </section>
    );
}
