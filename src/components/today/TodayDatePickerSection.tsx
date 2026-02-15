import { Dispatch, SetStateAction, useMemo, useRef } from "react";
import { CalendarDays } from "lucide-react";
import { t as tr } from "../../i18n";
import { AppLanguage, Cycle, DateFormat } from "../../types";
import { addDays, formatDate, getWeekIndexForDate, parseIso, toIsoDate, weekdayLabel, weekdayLabelLong } from "../../utils";
import { Icon } from "../ui/Icon";

type TodayDatePickerSectionProps = {
    language: AppLanguage;
    dateFormat: DateFormat;
    cycle: Cycle;
    setSelectedWeek: Dispatch<SetStateAction<number>>;
    selectedDate: string;
    setSelectedDate: Dispatch<SetStateAction<string>>;
};

export function TodayDatePickerSection({
    language,
    dateFormat,
    cycle,
    setSelectedWeek,
    selectedDate,
    setSelectedDate
}: TodayDatePickerSectionProps) {
    const touchStartX = useRef<number | null>(null);
    const dateInputRef = useRef<HTMLInputElement | null>(null);

    const weekDates = useMemo(() => {
        const date = parseIso(selectedDate);
        const weekday = (date.getDay() + 6) % 7; // Monday=0 ... Sunday=6
        const mondayDate = new Date(date);
        mondayDate.setDate(date.getDate() - weekday);
        const monday = toIsoDate(mondayDate);
        return Array.from({ length: 7 }, (_, index) => addDays(monday, index));
    }, [selectedDate]);

    const todayIso = toIsoDate(new Date());
    const selectDate = (date: string) => {
        setSelectedDate(date);
        setSelectedWeek(getWeekIndexForDate(cycle, date));
    };

    const openDatePicker = () => {
        const picker = dateInputRef.current as (HTMLInputElement & { showPicker?: () => void }) | null;
        if (!picker) return;
        try {
            if (typeof picker.showPicker === "function") {
                picker.showPicker();
                return;
            }
        } catch {
            // Fallback below
        }
        picker.focus({ preventScroll: true });
        picker.click();
    };

    return (
        <>
            <div className="today-nav-header">
                <div className="today-nav-actions">
                    <button className="button" type="button" onClick={() => selectDate(todayIso)}>
                        {tr(language, "common.today")}
                    </button>
                    <label
                        className="today-calendar-trigger"
                        title={tr(language, "today.pickDate")}
                        aria-label={tr(language, "today.pickDate")}
                        onClick={openDatePicker}
                    >
                        <span aria-hidden="true"><Icon icon={CalendarDays} size={18} /></span>
                        <input
                            ref={dateInputRef}
                            className="today-calendar-input"
                            type="date"
                            value={selectedDate}
                            onChange={(event) => selectDate(event.target.value)}
                            aria-label={tr(language, "today.pickDate")}
                        />
                    </label>
                </div>
            </div>

            <div className="today-week-strip-nav">
                <button
                    type="button"
                    className="today-week-shift-btn"
                    onClick={() => selectDate(addDays(selectedDate, -7))}
                    aria-label={tr(language, "today.prevWeek")}
                    title={tr(language, "today.prevWeek")}
                >
                    ‹
                </button>

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

                        return (
                            <button
                                key={date}
                                type="button"
                                className={`today-weekday-chip ${isSelected ? "selected" : ""} ${isToday ? "today" : ""}`}
                                onClick={() => selectDate(date)}
                                aria-label={`${weekdayLabelLong(date, language)} ${formatDate(date, dateFormat, language)}`}
                            >
                                <span className="today-weekday-label">{weekdayLabel(date, language)}</span>
                                <span className="today-weekday-date">{parseIso(date).getDate()}</span>
                                <span className="today-weekday-indicators">
                                    {isToday ? <span className="day-today-dot" /> : null}
                                </span>
                            </button>
                        );
                    })}
                </div>

                <button
                    type="button"
                    className="today-week-shift-btn"
                    onClick={() => selectDate(addDays(selectedDate, 7))}
                    aria-label={tr(language, "today.nextWeek")}
                    title={tr(language, "today.nextWeek")}
                >
                    ›
                </button>
            </div>
        </>
    );
}
