import { t as tr } from "../../i18n";
import { AppLanguage, Cycle, WeeklyReview } from "../../types";
import { getWritableReviewEntries, upsertCurrentWeeklyReviewEntry } from "../../utils";

type WeekReviewsSectionProps = {
    language: AppLanguage;
    selectedWeek: number;
    weeklyReview: WeeklyReview;
    updateCycle: (updater: (prev: Cycle) => Cycle) => void;
};

export function WeekReviewsSection({
    language,
    selectedWeek,
    weeklyReview,
    updateCycle
}: WeekReviewsSectionProps) {
    return (
        <>
            <div className="divider" />

            <div className="subcard">
                <h3>{tr(language, "review.weekly", { week: selectedWeek })}</h3>
                <div className="grid">
                    <label>
                        {tr(language, "review.wins")}
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
                        {tr(language, "review.lessons")}
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
                        {tr(language, "review.nextFocus")}
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
        </>
    );
}
