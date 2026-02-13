import { Cycle, Habit } from "../types";
import { getWeekIndexForDate } from "./cycleMath";
import { parseIso } from "./date";

export function isHabitPlannedOnDate(cycle: Cycle, habit: Habit, date: string): boolean {
    if (habit.startedAt && date < habit.startedAt) return false;
    if (!Array.isArray(cycle.weeks) || cycle.weeks.length === 0) return false;

    const cycleStart = cycle.weeks[0]?.startDate;
    const cycleEnd = cycle.weeks[cycle.weeks.length - 1]?.endDate;
    if (!cycleStart || !cycleEnd) return false;
    if (date < cycleStart || date > cycleEnd) return false;

    const weekIdx = getWeekIndexForDate(cycle, date);
    if (weekIdx < habit.activeFrom || weekIdx > habit.activeTo) return false;

    const dayOfWeek = parseIso(date).getDay();
    if (habit.frequency === "daily") return true;
    if (habit.frequency === "weekdays") return dayOfWeek >= 1 && dayOfWeek <= 5;
    if (Array.isArray(habit.frequency)) return habit.frequency.includes(dayOfWeek);
    return false;
}
