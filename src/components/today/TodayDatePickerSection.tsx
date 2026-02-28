import { Dispatch, SetStateAction, useMemo, useRef } from "react";
import { CalendarBlank, CaretLeft, CaretRight, List, Clock } from "@phosphor-icons/react";
import { t as tr } from "../../i18n";
import { AppLanguage, Cycle, DateFormat } from "../../types";
import { addDays, getWeekIndexForDate } from "../../utils";

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

function formatWeekDateLabel(dateIso: string, language: AppLanguage): string {
    const locale = language === "de" ? "de-DE" : "en-US";
    return new Date(`${dateIso}T00:00:00`).toLocaleDateString(locale, {
        day: "numeric",
        month: "short"
    });
}

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
    const dateInputRef = useRef<HTMLInputElement | null>(null);
    void dateFormat;

    const selectedWeek = getWeekIndexForDate(cycle, selectedDate);
    const selectedWeekData = cycle.weeks.find((week) => week.index === selectedWeek);

    const weekRange = useMemo(() => {
        if (selectedWeekData) {
            return {
                start: selectedWeekData.startDate,
                end: selectedWeekData.endDate,
            };
        }

        const baseDate = new Date(`${selectedDate}T00:00:00`);
        const weekday = (baseDate.getDay() + 6) % 7;
        const monday = new Date(baseDate);
        monday.setDate(baseDate.getDate() - weekday);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);

        const toIso = (date: Date) => date.toISOString().slice(0, 10);
        return {
            start: toIso(monday),
            end: toIso(sunday),
        };
    }, [selectedDate, selectedWeekData]);

    const weekLabel = `${tr(language, "common.week")} ${selectedWeek}`;
    const weekDatesLabel = `${formatWeekDateLabel(weekRange.start, language)} - ${formatWeekDateLabel(weekRange.end, language)}`;

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
        <div className="twc-card week-navigation-bar">
            <button
                type="button"
                className="twc-nav-btn"
                onClick={() => selectDate(addDays(selectedDate, -7))}
                aria-label={tr(language, "today.prevWeek")}
                title={tr(language, "today.prevWeek")}
            >
                <CaretLeft size={18} weight="bold" />
            </button>

            <div className="twc-week-info">
                <span className="twc-week-label">{weekLabel}</span>
                <span className="twc-week-dates">{weekDatesLabel}</span>
            </div>

            <div className="twc-toggle" role="group" aria-label={tr(language, "today.dayPlan")}>
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

            <button
                type="button"
                className="twc-calendar-btn"
                onClick={openDatePicker}
                aria-label={tr(language, "today.pickDate")}
                title={tr(language, "today.pickDate")}
            >
                <CalendarBlank size={18} weight="bold" />
            </button>

            <button
                type="button"
                className="twc-nav-btn"
                onClick={() => selectDate(addDays(selectedDate, 7))}
                aria-label={tr(language, "today.nextWeek")}
                title={tr(language, "today.nextWeek")}
            >
                <CaretRight size={18} weight="bold" />
            </button>

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
