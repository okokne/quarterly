import { Cycle, Week } from "../types";
import { addDays, parseIso } from "./date";

export function getWeekIndexForDate(cycle: Cycle, dateStr: string): number {
    const date = parseIso(dateStr);
    const start = parseIso(cycle.weeks[0].startDate);
    const diffDays = Math.floor((date.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
    const rawIndex = Math.floor(diffDays / 7) + 1;
    if (rawIndex < 1) return 1;
    if (rawIndex > 12) return 12;
    return rawIndex;
}

export function getDatesInWeek(week: Week): string[] {
    return Array.from({ length: 7 }, (_, i) => addDays(week.startDate, i));
}

export function clamp(n: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, n));
}
