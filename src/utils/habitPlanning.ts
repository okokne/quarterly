import { Cycle, Habit } from "../types";
import { parseIso } from "./date";

export function isHabitPlannedOnDate(_cycle: Cycle, habit: Habit, date: string): boolean {
    if (habit.startedAt && date < habit.startedAt) return false;

    const dayOfWeek = parseIso(date).getDay();
    if (habit.frequency === "daily") return true;
    if (habit.frequency === "weekdays") return dayOfWeek >= 1 && dayOfWeek <= 5;
    if (Array.isArray(habit.frequency)) return habit.frequency.includes(dayOfWeek);
    return false;
}
