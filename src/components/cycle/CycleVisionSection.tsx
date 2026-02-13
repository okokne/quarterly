import { AppLanguage, Cycle } from "../../types";
import { t as tr } from "../../i18n";

type CycleVisionSectionProps = {
    cycle: Cycle;
    language: AppLanguage;
    readOnly: boolean;
    updateCycle: (updater: (prev: Cycle) => Cycle) => void;
};

export function CycleVisionSection({
    cycle,
    language,
    readOnly,
    updateCycle
}: CycleVisionSectionProps) {
    return (
        <section className="cycle-section">
            <h3>{tr(language, "cycle.visionTitle")}</h3>
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
            </label>
        </section>
    );
}
