import { Dispatch, SetStateAction, useMemo, useRef } from "react";
import { t as tr } from "../../i18n";
import { AppLanguage, Cycle, DateFormat } from "../../types";
import { addDays, formatDate, getWeekIndexForDate, parseIso, toIsoDate, weekdayLabel } from "../../utils";
import { ProgressRing } from "../ProgressRing";

type TodayDatePickerSectionProps = {
    language: AppLanguage;
    dateFormat: DateFormat;
    cycle: Cycle;
    setSelectedWeek: Dispatch<SetStateAction<number>>;
    selectedDate: string;
    setSelectedDate: Dispatch<SetStateAction<string>>;
    weekCompletion: { done: number; total: number; percent: number };
};

export function TodayDatePickerSection({
    language,
    dateFormat,
    cycle,
    setSelectedWeek,
    selectedDate,
    setSelectedDate,
    weekCompletion
}: TodayDatePickerSectionProps) {
    const touchStartX = useRef<number | null>(null);

    const weekDates = useMemo(() => {
        const date = parseIso(selectedDate);
        const weekday = (date.getDay() + 6) % 7; // Monday=0 ... Sunday=6
        const mondayDate = new Date(date);
        mondayDate.setDate(date.getDate() - weekday);
        const monday = toIsoDate(mondayDate);
        return Array.from({ length: 7 }, (_, index) => addDays(monday, index));
    }, [selectedDate]);

    const todayIso = toIsoDate(new Date());
    const datesWithReviewEntries = useMemo(() => {
        return new Set((cycle.reviewEntries ?? []).map((entry) => entry.date));
    }, [cycle.reviewEntries]);

    const selectDate = (date: string) => {
        setSelectedDate(date);
        setSelectedWeek(getWeekIndexForDate(cycle, date));
    };

    return (
        <>
            <div className="today-nav-header">
                <div className="today-date-selected">
                    <strong>{weekdayLabel(selectedDate, language)}</strong>
                    <span className="muted">{formatDate(selectedDate, dateFormat, language)}</span>
                </div>
                <div className="today-nav-actions">
                    <div className="today-week-progress" title={tr(language, "today.weekProgress")}>
                        <ProgressRing
                            value={weekCompletion.done}
                            max={weekCompletion.total || 1}
                            size={42}
                            strokeWidth={6}
                        />
                        <span className="today-week-progress-value">{weekCompletion.percent}%</span>
                    </div>
                    <button className="button" type="button" onClick={() => selectDate(todayIso)}>
                        {tr(language, "common.today")}
                    </button>
                    <label className="today-calendar-trigger" title={tr(language, "today.pickDate")}>
                        🗓
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(event) => selectDate(event.target.value)}
                        />
                    </label>
                </div>
            </div>

            <div
                className="today-week-strip"
                onTouchStart={(event) => {
                    touchStartX.current = event.touches[0]?.clientX ?? null;
                }}
                onTouchEnd={(event) => {
                    if (touchStartX.current === null) return;
                    const endX = event.changedTouches[0]?.clientX ?? touchStartX.current;
                    const delta = endX - touchStartX.current;
                    touchStartX.current = null;
                    if (Math.abs(delta) < 40) return;
                    selectDate(addDays(selectedDate, delta < 0 ? 7 : -7));
                }}
            >
                {weekDates.map((date) => {
                    const isSelected = date === selectedDate;
                    const isToday = date === todayIso;
                    const hasEntries = (cycle.dailyPlans[date]?.length ?? 0) > 0
                        || Boolean(cycle.dailyReviews[date])
                        || (cycle.habitLog[date]?.length ?? 0) > 0
                        || datesWithReviewEntries.has(date);

                    return (
                        <button
                            key={date}
                            type="button"
                            className={`today-weekday-chip ${isSelected ? "selected" : ""} ${isToday ? "today" : ""}`}
                            onClick={() => selectDate(date)}
                            aria-label={`${weekdayLabel(date, language)} ${formatDate(date, dateFormat, language)}`}
                        >
                            <span className="today-weekday-label">{weekdayLabel(date, language)}</span>
                            <span className="today-weekday-date">{parseIso(date).getDate()}</span>
                            <span className="today-weekday-indicators">
                                {hasEntries && <span className="day-has-entry-dot" />}
                                {isToday && <span className="day-today-dot" />}
                            </span>
                        </button>
                    );
                })}
            </div>
        </>
    );
}
