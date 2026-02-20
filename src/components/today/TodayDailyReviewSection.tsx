import { useEffect, useMemo, useState } from "react";
import { BookOpen, Check } from "../ui/icons";
import { Icon } from "../ui/Icon";
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
        <section className={`today-daily-review-card ${isOpen ? "is-open" : ""} ${reviewProgress === 2 ? "is-complete" : ""}`} id="today-daily-review">
            <header className="daily-review-header" onClick={() => setIsOpen((prev) => !prev)}>
                <div className="daily-review-header-content">
                    <div className="daily-review-icon-container">
                        <Icon icon={reviewProgress === 2 ? Check : BookOpen} size={20} />
                    </div>
                    <div>
                        <h3 className="daily-review-title">{tr(language, "review.daily", { date: formatDate(selectedDate, dateFormat, language) })}</h3>
                        <p className="daily-review-subtitle muted">
                            {reviewProgress === 0 && "Take a moment to reflect on your day"}
                            {reviewProgress > 0 && reviewProgress < 2 && "Keep going! Reflection in progress..."}
                            {reviewProgress === 2 && "Review complete. Great job today!"}
                        </p>
                    </div>
                </div>
                <div className="daily-review-controls">
                    <span className="daily-review-progress-badge">{reviewProgress}/2</span>
                    <button className="icon-btn" aria-expanded={isOpen} type="button">
                        <span className={`chevron ${isOpen ? "open" : ""}`}>▼</span>
                    </button>
                </div>
            </header>
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
        </section>
    );
}
