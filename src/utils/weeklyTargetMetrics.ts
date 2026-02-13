import { Cycle, DailyBlock, WeeklyTarget } from "../types";
import { getDatesInWeek } from "./cycleMath";

export function getBlockContribution(block: DailyBlock): number {
    const amount = Math.max(1, block.amount ?? 1);
    const fallback = block.done ? amount : 0;
    const raw = Number.isFinite(block.actual) ? Number(block.actual) : fallback;
    return Math.max(0, raw);
}

export function getAutoDoneForTargetInWeek(cycle: Cycle, weekIndex: number, targetId: string): number {
    const week = cycle.weeks.find((item) => item.index === weekIndex);
    if (!week) return 0;

    return getDatesInWeek(week).reduce((sum, date) => {
        const blocks = cycle.dailyPlans[date] ?? [];
        return sum + blocks
            .filter((block) => block.linkedTargetId === targetId)
            .reduce((acc, block) => acc + getBlockContribution(block), 0);
    }, 0);
}

export function getEffectiveWeeklyDone(cycle: Cycle, weekIndex: number, target: WeeklyTarget): number {
    const autoDone = getAutoDoneForTargetInWeek(cycle, weekIndex, target.id);
    const adjusted = autoDone + (target.manualAdjust ?? 0);
    const bounded = Math.max(0, adjusted);
    return Math.min(target.target, bounded);
}

export function getRemainingFromEffectiveDone(cycle: Cycle, weekIndex: number, target: WeeklyTarget): number {
    const effectiveDone = getEffectiveWeeklyDone(cycle, weekIndex, target);
    return Math.max(0, target.target - effectiveDone);
}
