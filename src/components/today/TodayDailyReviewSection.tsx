import { t as tr } from "../../i18n";
import { AppLanguage, Cycle, DailyReview, DateFormat } from "../../types";
import { formatDate, getWritableReviewEntries, upsertCurrentDailyReviewEntry } from "../../utils";

type TodayDailyReviewSectionProps = {
    language: AppLanguage;
    dateFormat: DateFormat;
    selectedDate: string;
    dailyReview: DailyReview;
    updateCycle: (updater: (prev: Cycle) => Cycle) => void;
};

export function TodayDailyReviewSection({
    language,
    dateFormat,
    selectedDate,
    dailyReview,
    updateCycle
}: TodayDailyReviewSectionProps) {
    return (
        <div className="subcard">
            <h3>{tr(language, "review.daily", { date: formatDate(selectedDate, dateFormat, language) })}</h3>
            <div className="grid">
                <label>
                    {tr(language, "review.good")}
                    <textarea
                        value={dailyReview.good}
                        onChange={(e) =>
                            updateCycle((prev) => ({
                                ...prev,
                                dailyReviews: {
                                    ...prev.dailyReviews,
                                    [selectedDate]: {
                                        ...(prev.dailyReviews[selectedDate] ?? { good: "", bad: "" }),
                                        good: e.target.value
                                    }
                                },
                                reviewEntries: upsertCurrentDailyReviewEntry({
                                    entries: getWritableReviewEntries(prev),
                                    date: selectedDate,
                                    review: {
                                        ...(prev.dailyReviews[selectedDate] ?? { good: "", bad: "" }),
                                        good: e.target.value
                                    },
                                    source: "today_tab"
                                })
                            }))
                        }
                    />
                </label>
                <label>
                    {tr(language, "review.bad")}
                    <textarea
                        value={dailyReview.bad}
                        onChange={(e) =>
                            updateCycle((prev) => ({
                                ...prev,
                                dailyReviews: {
                                    ...prev.dailyReviews,
                                    [selectedDate]: {
                                        ...(prev.dailyReviews[selectedDate] ?? { good: "", bad: "" }),
                                        bad: e.target.value
                                    }
                                },
                                reviewEntries: upsertCurrentDailyReviewEntry({
                                    entries: getWritableReviewEntries(prev),
                                    date: selectedDate,
                                    review: {
                                        ...(prev.dailyReviews[selectedDate] ?? { good: "", bad: "" }),
                                        bad: e.target.value
                                    },
                                    source: "today_tab"
                                })
                            }))
                        }
                    />
                </label>
            </div>
        </div>
    );
}
