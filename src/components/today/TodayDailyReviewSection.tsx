import { useEffect, useMemo, useState } from "react";
import { t as tr } from "../../i18n";
import { AppLanguage, Cycle, DailyBlock, DailyReview, DateFormat } from "../../types";
import { formatDate, getWritableReviewEntries, upsertCurrentDailyReviewEntry } from "../../utils";

type TodayDailyReviewSectionProps = {
    language: AppLanguage;
    dateFormat: DateFormat;
    selectedDate: string;
    dayBlocks: DailyBlock[];
    dailyReview: DailyReview;
    updateCycle: (updater: (prev: Cycle) => Cycle) => void;
};

export function TodayDailyReviewSection({
    language,
    dateFormat,
    selectedDate,
    dayBlocks,
    dailyReview,
    updateCycle
}: TodayDailyReviewSectionProps) {
    const now = new Date();
    const isEvening = now.getHours() >= 18;
    const allBlocksDone = dayBlocks.length > 0 && dayBlocks.every((block) => {
        const amount = Math.max(1, block.amount ?? 1);
        const actual = Math.max(0, block.actual ?? (block.done ? amount : 0));
        return actual >= amount || block.done;
    });
    const shouldAutoOpen = isEvening || allBlocksDone;
    const [isOpen, setIsOpen] = useState<boolean>(shouldAutoOpen);

    useEffect(() => {
        if (shouldAutoOpen) setIsOpen(true);
    }, [shouldAutoOpen]);

    const reviewProgress = useMemo(() => {
        const fields = [dailyReview.good.trim(), dailyReview.bad.trim()];
        return fields.filter(Boolean).length;
    }, [dailyReview.bad, dailyReview.good]);

    return (
        <div className="subcard">
            <div className="section-header">
                <h3>{tr(language, "review.daily", { date: formatDate(selectedDate, dateFormat, language) })}</h3>
                <div className="button-row compact">
                    <span className="muted">{reviewProgress}/2</span>
                    <button className="button" onClick={() => setIsOpen((prev) => !prev)}>
                        {isOpen ? tr(language, "today.hideReview") : tr(language, "today.openReview")}
                    </button>
                </div>
            </div>
            {isOpen && (
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
            )}
        </div>
    );
}
