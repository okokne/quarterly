import { Dispatch, SetStateAction } from "react";
import { t as tr } from "../../i18n";
import { AppLanguage, Cycle, DateFormat } from "../../types";
import { formatDate, formatRange, getDatesInWeek, weekdayLabel } from "../../utils";

type TodayDatePickerSectionProps = {
    language: AppLanguage;
    dateFormat: DateFormat;
    cycle: Cycle;
    selectedWeek: number;
    setSelectedWeek: Dispatch<SetStateAction<number>>;
    selectedDate: string;
    setSelectedDate: Dispatch<SetStateAction<string>>;
    currentWeek: Cycle["weeks"][number];
};

export function TodayDatePickerSection({
    language,
    dateFormat,
    cycle,
    selectedWeek,
    setSelectedWeek,
    selectedDate,
    setSelectedDate,
    currentWeek
}: TodayDatePickerSectionProps) {
    return (
        <>
            <div className="grid">
                <label>
                    {tr(language, "today.weekSelect")}
                    <select
                        value={selectedWeek}
                        onChange={(e) => {
                            const nextWeek = Number(e.target.value);
                            setSelectedWeek(nextWeek);
                            const week = cycle.weeks.find((item) => item.index === nextWeek);
                            if (week) setSelectedDate(week.startDate);
                        }}
                    >
                        {cycle.weeks.map((week) => (
                            <option key={week.index} value={week.index}>
                                {tr(language, "app.headerWeekShort", { week: week.index })} · {formatRange(week.startDate, week.endDate, dateFormat, language)}
                            </option>
                        ))}
                    </select>
                </label>
            </div>

            <div className="week-grid">
                {getDatesInWeek(currentWeek).map((date) => (
                    <button
                        key={date}
                        className={`chip ${selectedDate === date ? "active" : ""}`}
                        onClick={() => setSelectedDate(date)}
                    >
                        {weekdayLabel(date, language)} · {formatDate(date, dateFormat, language)}
                    </button>
                ))}
            </div>
        </>
    );
}
