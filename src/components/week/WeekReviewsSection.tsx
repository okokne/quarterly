import { t as tr } from "../../i18n";
import { AppLanguage, Cycle, WeeklyReview } from "../../types";
import { getWeekLabel, getWritableReviewEntries, upsertCurrentWeeklyReviewEntry } from "../../utils";

type WeekReviewsSectionProps = {
    language: AppLanguage;
    cycle: Cycle;
    selectedWeek: number;
    weeklyReview: WeeklyReview;
    updateCycle: (updater: (prev: Cycle) => Cycle) => void;
};

export function WeekReviewsSection({
    language,
    cycle,
    selectedWeek,
    weeklyReview,
    updateCycle
}: WeekReviewsSectionProps) {
    return (
        <div className="week-review-content" id="week-review">
            <h3>{tr(language, "week.reviewTitle", { weekLabel: getWeekLabel(cycle, selectedWeek, language) })}</h3>
            <p className="muted week-review-hint">{tr(language, "week.reviewHint")}</p>
            <div className="grid week-review-grid">
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
    );
}
