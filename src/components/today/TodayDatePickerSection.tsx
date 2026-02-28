import { Dispatch, SetStateAction, useMemo, useRef } from "react";
import { CalendarBlank, CaretLeft, CaretRight, List, Clock } from "@phosphor-icons/react";
import { t as tr } from "../../i18n";
import { AppLanguage, Cycle, DateFormat } from "../../types";
import {
    addDays,
    formatDate,
    getWeekIndexForDate,
    parseIso,
    toIsoDate,
    weekdayLabel,
    weekdayLabelLong,
} from "../../utils";

type DayPlanViewMode = "list" | "timeline";

type TodayDatePickerSectionProps = {
    language: AppLanguage;
    dateFormat: DateFormat;
    cycle: Cycle;
    setSelectedWeek: Dispatch<SetStateAction<number>>;
    selectedDate: string;
    setSelectedDate: Dispatch<SetStateAction<string>>;
    dayPlanViewMode: DayPlanViewMode;
    setDayPlanViewMode: Dispatch<SetStateAction<DayPlanViewMode>>;
};

export function TodayDatePickerSection({
    language,
    dateFormat,
    cycle,
    setSelectedWeek,
    selectedDate,
    setSelectedDate,
    dayPlanViewMode,
    setDayPlanViewMode,
}: TodayDatePickerSectionProps) {
    const touchStartX = useRef<number | null>(null);
    const dateInputRef = useRef<HTMLInputElement | null>(null);

    const weekDates = useMemo(() => {
        const date = parseIso(selectedDate);
        const weekday = (date.getDay() + 6) % 7; // Monday=0 … Sunday=6
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
        const input = dateInputRef.current;
        if (!input) return;
        const pickerInput = input as HTMLInputElement & { showPicker?: () => void };

        try {
            if (typeof pickerInput.showPicker === "function") {
                pickerInput.showPicker();
                return;
            }
        } catch {
            // Fallback to click for browsers that block showPicker.
        }

        input.click();
        input.focus();
    };

    return (
        <div className="twc-card">
            <div className="twc-nav-strip">
                {/* Left nav arrow */}
                <button
                    type="button"
                    className="twc-nav-btn"
                    onClick={() => selectDate(addDays(selectedDate, -7))}
                    aria-label={tr(language, "today.prevWeek")}
                    title={tr(language, "today.prevWeek")}
                >
                    <CaretLeft size={18} weight="bold" />
                </button>

                {/* Days strip */}
                <div
                    className="twc-days"
                    onTouchStart={(e) => {
                        touchStartX.current = e.touches[0]?.clientX ?? null;
                    }}
                    onTouchEnd={(e) => {
                        if (touchStartX.current === null) return;
                        const endX = e.changedTouches[0]?.clientX ?? touchStartX.current;
                        const delta = endX - touchStartX.current;
                        touchStartX.current = null;
                        if (Math.abs(delta) < 40) return;
                        selectDate(addDays(selectedDate, delta < 0 ? 7 : -7));
                    }}
                >
                    {weekDates.map((date) => {
                        const isSelected = date === selectedDate;
                        const isToday = date === todayIso;
                        const dayNum = parseIso(date).getDate();
                        const dayLbl = weekdayLabel(date, language).slice(0, 2).toUpperCase();

                        return (
                            <button
                                key={date}
                                type="button"
                                className={`twc-day${isSelected ? " twc-day-active" : ""}${isToday && !isSelected ? " twc-day-today" : ""}`}
                                onClick={() => selectDate(date)}
                                aria-label={`${weekdayLabelLong(date, language)} ${formatDate(date, dateFormat, language)}`}
                                aria-pressed={isSelected}
                            >
                                <span className="twc-day-label">{dayLbl}</span>
                                <span className="twc-day-num">{dayNum}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Right nav arrow */}
                <button
                    type="button"
                    className="twc-nav-btn"
                    onClick={() => selectDate(addDays(selectedDate, 7))}
                    aria-label={tr(language, "today.nextWeek")}
                    title={tr(language, "today.nextWeek")}
                >
                    <CaretRight size={18} weight="bold" />
                </button>

                {/* Date picker trigger */}
                <button
                    type="button"
                    className="twc-calendar-btn"
                    onClick={openDatePicker}
                    aria-label={tr(language, "today.pickDate")}
                    title={tr(language, "today.pickDate")}
                >
                    <CalendarBlank size={18} weight="bold" />
                </button>
            </div>

            {/* View toggle */}
            <div className="twc-toggle">
                <button
                    type="button"
                    className={`twc-toggle-btn${dayPlanViewMode === "list" ? " twc-toggle-active" : ""}`}
                    onClick={() => setDayPlanViewMode("list")}
                    aria-pressed={dayPlanViewMode === "list"}
                    title={tr(language, "today.viewList")}
                >
                    <List size={14} />
                    <span>{tr(language, "today.viewList")}</span>
                </button>
                <button
                    type="button"
                    className={`twc-toggle-btn${dayPlanViewMode === "timeline" ? " twc-toggle-active" : ""}`}
                    onClick={() => setDayPlanViewMode("timeline")}
                    aria-pressed={dayPlanViewMode === "timeline"}
                    title={tr(language, "today.viewTimeline")}
                >
                    <Clock size={14} />
                    <span>{tr(language, "today.viewTimeline")}</span>
                </button>
            </div>

            {/* Hidden date input for native date picker (still accessible) */}
            <input
                ref={dateInputRef}
                type="date"
                value={selectedDate}
                onChange={(e) => selectDate(e.target.value)}
                aria-label={tr(language, "today.pickDate")}
                style={{ position: "absolute", opacity: 0, pointerEvents: "none", width: 0, height: 0 }}
                tabIndex={-1}
            />
        </div>
    );
}
