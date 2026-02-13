import { t as tr } from "../../i18n";
import { AppLanguage, Cycle, FinalReview, WeeklyReview } from "../../types";
import { getWritableReviewEntries, upsertCurrentWeeklyReviewEntry } from "../../utils";

type WeekReviewsSectionProps = {
    cycle: Cycle;
    language: AppLanguage;
    selectedWeek: number;
    weeklyReview: WeeklyReview;
    finalReview: FinalReview;
    updateCycle: (updater: (prev: Cycle) => Cycle) => void;
};

export function WeekReviewsSection({
    cycle,
    language,
    selectedWeek,
    weeklyReview,
    finalReview,
    updateCycle
}: WeekReviewsSectionProps) {
    return (
        <>
            <div className="divider" />

            <div className="subcard">
                <h3>{tr(language, "week.vision")}</h3>
                <textarea value={cycle.vision} onChange={(e) => updateCycle((prev) => ({ ...prev, vision: e.target.value }))} />
            </div>

            <div className="subcard">
                <h3>{tr(language, "review.weekly", { week: selectedWeek })}</h3>
                <div className="grid">
                    <label>
                        {tr(language, "review.good")}
                        <textarea
                            value={weeklyReview.good}
                            onChange={(e) =>
                                updateCycle((prev) => ({
                                    ...prev,
                                    weeklyReviews: {
                                        ...prev.weeklyReviews,
                                        [selectedWeek]: {
                                            ...(prev.weeklyReviews[selectedWeek] ?? { good: "", bad: "", change: "" }),
                                            good: e.target.value
                                        }
                                    },
                                    reviewEntries: upsertCurrentWeeklyReviewEntry({
                                        entries: getWritableReviewEntries(prev),
                                        weekIndex: selectedWeek,
                                        date: prev.weeks.find((week) => week.index === selectedWeek)?.startDate ?? prev.startDate,
                                        review: {
                                            ...(prev.weeklyReviews[selectedWeek] ?? { good: "", bad: "", change: "" }),
                                            good: e.target.value
                                        },
                                        source: "week_tab"
                                    })
                                }))
                            }
                        />
                    </label>
                    <label>
                        {tr(language, "review.bad")}
                        <textarea
                            value={weeklyReview.bad}
                            onChange={(e) =>
                                updateCycle((prev) => ({
                                    ...prev,
                                    weeklyReviews: {
                                        ...prev.weeklyReviews,
                                        [selectedWeek]: {
                                            ...(prev.weeklyReviews[selectedWeek] ?? { good: "", bad: "", change: "" }),
                                            bad: e.target.value
                                        }
                                    },
                                    reviewEntries: upsertCurrentWeeklyReviewEntry({
                                        entries: getWritableReviewEntries(prev),
                                        weekIndex: selectedWeek,
                                        date: prev.weeks.find((week) => week.index === selectedWeek)?.startDate ?? prev.startDate,
                                        review: {
                                            ...(prev.weeklyReviews[selectedWeek] ?? { good: "", bad: "", change: "" }),
                                            bad: e.target.value
                                        },
                                        source: "week_tab"
                                    })
                                }))
                            }
                        />
                    </label>
                    <label>
                        {tr(language, "review.changeNextWeek")}
                        <textarea
                            value={weeklyReview.change}
                            onChange={(e) =>
                                updateCycle((prev) => ({
                                    ...prev,
                                    weeklyReviews: {
                                        ...prev.weeklyReviews,
                                        [selectedWeek]: {
                                            ...(prev.weeklyReviews[selectedWeek] ?? { good: "", bad: "", change: "" }),
                                            change: e.target.value
                                        }
                                    },
                                    reviewEntries: upsertCurrentWeeklyReviewEntry({
                                        entries: getWritableReviewEntries(prev),
                                        weekIndex: selectedWeek,
                                        date: prev.weeks.find((week) => week.index === selectedWeek)?.startDate ?? prev.startDate,
                                        review: {
                                            ...(prev.weeklyReviews[selectedWeek] ?? { good: "", bad: "", change: "" }),
                                            change: e.target.value
                                        },
                                        source: "week_tab"
                                    })
                                }))
                            }
                        />
                    </label>
                </div>
            </div>

            <div className="subcard">
                <h3>{tr(language, "review.final12")}</h3>
                <div className="grid">
                    <label>
                        {tr(language, "review.breakthroughs")}
                        <textarea
                            value={finalReview.breakthroughs}
                            onChange={(e) =>
                                updateCycle((prev) => ({
                                    ...prev,
                                    finalReview: { ...finalReview, breakthroughs: e.target.value }
                                }))
                            }
                        />
                    </label>
                    <label>
                        {tr(language, "review.lifeQuality")}
                        <textarea
                            value={finalReview.lifeQuality}
                            onChange={(e) =>
                                updateCycle((prev) => ({
                                    ...prev,
                                    finalReview: { ...finalReview, lifeQuality: e.target.value }
                                }))
                            }
                        />
                    </label>
                    <label>
                        {tr(language, "review.nextCycle")}
                        <textarea
                            value={finalReview.nextCycle}
                            onChange={(e) =>
                                updateCycle((prev) => ({
                                    ...prev,
                                    finalReview: { ...finalReview, nextCycle: e.target.value }
                                }))
                            }
                        />
                    </label>
                </div>
            </div>
        </>
    );
}
