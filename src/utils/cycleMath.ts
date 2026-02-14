import { Cycle, Week } from "../types";
import { addDays, parseIso } from "./date";

type DateInput = string | Date;

function toStartOfLocalDay(input: DateInput): Date {
    if (typeof input === "string") {
        return parseIso(input);
    }
    return new Date(input.getFullYear(), input.getMonth(), input.getDate());
}

export function getCurrentWeekIndex(
    cycleStartDate: string,
    todayDate: DateInput,
    totalWeeks = 12
): number {
    const start = toStartOfLocalDay(cycleStartDate);
    const today = toStartOfLocalDay(todayDate);
    const dayDiff = Math.floor((today.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
    const rawIndex = Math.floor(dayDiff / 7) + 1;
    return clamp(rawIndex, 1, Math.max(1, totalWeeks));
}

export function getWeekIndexForDate(cycle: Cycle, dateStr: string): number {
    const totalWeeks = cycle.weeks.length || 12;
    const cycleStartDate = cycle.weeks[0]?.startDate ?? cycle.startDate;
    return getCurrentWeekIndex(cycleStartDate, dateStr, totalWeeks);
}

export function getDatesInWeek(week: Week): string[] {
    return Array.from({ length: 7 }, (_, i) => addDays(week.startDate, i));
}

export function clamp(n: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, n));
}
