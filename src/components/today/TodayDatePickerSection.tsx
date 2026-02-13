import { Dispatch, SetStateAction } from "react";
import { t as tr } from "../../i18n";
import { AppLanguage, Cycle, DateFormat } from "../../types";
import { addDays, formatDate, getWeekIndexForDate, weekdayLabel } from "../../utils";

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
    const firstDate = cycle.startDate;
    const lastDate = cycle.weeks[cycle.weeks.length - 1]?.endDate ?? cycle.startDate;

    const selectDate = (date: string) => {
        const bounded = date < firstDate ? firstDate : date > lastDate ? lastDate : date;
        setSelectedDate(bounded);
        setSelectedWeek(getWeekIndexForDate(cycle, bounded));
    };

    return (
        <>
            <div className="today-date-controls">
                <button className="button" onClick={() => selectDate(addDays(selectedDate, -1))}>
                    {tr(language, "today.prevDay")}
                </button>
                <button className="button" onClick={() => selectDate(addDays(selectedDate, 1))}>
                    {tr(language, "today.nextDay")}
                </button>
                <button className="button" onClick={() => selectDate(new Date().toISOString().slice(0, 10))}>
                    {tr(language, "common.today")}
                </button>
                <label className="today-date-input">
                    {tr(language, "today.pickDate")}
                    <input
                        type="date"
                        value={selectedDate}
                        min={firstDate}
                        max={lastDate}
                        onChange={(event) => selectDate(event.target.value)}
                    />
                </label>
            </div>

            <div className="today-date-selected">
                <strong>{weekdayLabel(selectedDate, language)}</strong>
                <span className="muted">{formatDate(selectedDate, dateFormat, language)}</span>
            </div>
        </>
    );
}
