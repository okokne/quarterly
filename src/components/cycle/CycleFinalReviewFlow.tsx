import { AppLanguage, Cycle } from "../../types";
import { t as tr } from "../../i18n";

type CycleFinalReviewFlowProps = {
    cycle: Cycle;
    language: AppLanguage;
    readOnly: boolean;
    updateCycle: (updater: (prev: Cycle) => Cycle) => void;
};

export function CycleFinalReviewFlow({
    cycle,
    language,
    readOnly,
    updateCycle
}: CycleFinalReviewFlowProps) {
    const finalReview = cycle.finalReview ?? {
        breakthroughs: "",
        lifeQuality: "",
        nextCycle: ""
    };

    return (
        <section className="cycle-section">
            <h3>{tr(language, "review.final12")}</h3>
            <div className="grid">
                <label>
                    {tr(language, "review.breakthroughs")}
                    <textarea
                        disabled={readOnly}
                        value={finalReview.breakthroughs}
                        onChange={(event) => {
                            const value = event.target.value;
                            updateCycle((prev) => ({
                                ...prev,
                                finalReview: { ...(prev.finalReview ?? finalReview), breakthroughs: value }
                            }));
                        }}
                    />
                </label>
                <label>
                    {tr(language, "review.lifeQuality")}
                    <textarea
                        disabled={readOnly}
                        value={finalReview.lifeQuality}
                        onChange={(event) => {
                            const value = event.target.value;
                            updateCycle((prev) => ({
                                ...prev,
                                finalReview: { ...(prev.finalReview ?? finalReview), lifeQuality: value }
                            }));
                        }}
                    />
                </label>
                <label>
                    {tr(language, "review.nextCycle")}
                    <textarea
                        disabled={readOnly}
                        value={finalReview.nextCycle}
                        onChange={(event) => {
                            const value = event.target.value;
                            updateCycle((prev) => ({
                                ...prev,
                                finalReview: { ...(prev.finalReview ?? finalReview), nextCycle: value }
                            }));
                        }}
                    />
                </label>
            </div>
        </section>
    );
}
