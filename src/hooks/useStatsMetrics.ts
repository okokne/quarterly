import { useMemo } from "react";
import { Cycle } from "../types";
import { getDatesInWeek } from "../utils";

export type GoalTrackingWeek = {
    weekIndex: number;
    done: number;
    target: number;
};

export type GoalTrackingItem = {
    title: string;
    unit: string;
    weeks: GoalTrackingWeek[];
    totalDone: number;
    totalTarget: number;
    percent: number;
    activeWeeks: number;
};

type UseStatsMetricsParams = {
    cycle: Cycle;
    selectedWeek: number;
};

function getAutoDoneForTarget(cycle: Cycle, week: Cycle["weeks"][number], targetId: string): number {
    const dates = getDatesInWeek(week);
    return dates.reduce((sum, date) => {
        const blocks = cycle.dailyPlans[date] ?? [];
        return sum + blocks
            .filter((block) => block.linkedTargetId === targetId)
            .reduce((acc, block) => acc + (block.actual ?? (block.done ? 1 : 0)), 0);
    }, 0);
}

export function useStatsMetrics({ cycle, selectedWeek }: UseStatsMetricsParams) {
    const weekPercents = useMemo(() => {
        const percents: Record<number, number> = {};
        cycle.weeks.forEach((week) => {
            const targets = cycle.weeklyTargets[week.index] ?? [];
            let totalDone = 0;
            let totalTarget = 0;

            targets.forEach((target) => {
                const autoDone = getAutoDoneForTarget(cycle, week, target.id);
                const done = Math.max(target.done, autoDone);
                totalDone += Math.min(done, target.target);
                totalTarget += target.target;
            });

            percents[week.index] = totalTarget > 0 ? Math.round((totalDone / totalTarget) * 100) : 0;
        });
        return percents;
    }, [cycle]);

    const cyclePercent = useMemo(() => {
        let cycleTotal = 0;
        let cycleDone = 0;

        cycle.weeks.forEach((week) => {
            const targets = cycle.weeklyTargets[week.index] ?? [];
            targets.forEach((target) => {
                const autoDone = getAutoDoneForTarget(cycle, week, target.id);
                const done = Math.max(target.done, autoDone);
                cycleDone += Math.min(done, target.target);
                cycleTotal += target.target;
            });
        });

        return cycleTotal > 0 ? `${Math.round((cycleDone / cycleTotal) * 100)}%` : "0%";
    }, [cycle]);

    const currentPercent = weekPercents[selectedWeek] ?? 0;
    const prevPercent = selectedWeek > 1 ? (weekPercents[selectedWeek - 1] ?? 0) : null;
    const diff = prevPercent !== null ? currentPercent - prevPercent : null;

    const goalTracking = useMemo<GoalTrackingItem[]>(() => {
        const targetMap = new Map<string, { title: string; unit: string; weeks: GoalTrackingWeek[] }>();

        cycle.weeks.forEach((week) => {
            const targets = cycle.weeklyTargets[week.index] ?? [];
            targets.forEach((target) => {
                const key = target.title.toLowerCase().trim();
                const autoDone = getAutoDoneForTarget(cycle, week, target.id);
                const done = Math.max(target.done, autoDone);

                if (!targetMap.has(key)) {
                    targetMap.set(key, { title: target.title, unit: target.unit ?? "", weeks: [] });
                }

                targetMap.get(key)!.weeks.push({
                    weekIndex: week.index,
                    done: Math.min(done, target.target),
                    target: target.target
                });
            });
        });

        return Array.from(targetMap.values())
            .filter((goal) => goal.weeks.length > 0)
            .map((goal) => {
                const totalDone = goal.weeks.reduce((sum, week) => sum + week.done, 0);
                const totalTarget = goal.weeks.reduce((sum, week) => sum + week.target, 0);
                const percent = totalTarget > 0 ? Math.round((totalDone / totalTarget) * 100) : 0;
                return {
                    title: goal.title,
                    unit: goal.unit,
                    weeks: goal.weeks,
                    totalDone,
                    totalTarget,
                    percent,
                    activeWeeks: goal.weeks.length
                };
            });
    }, [cycle]);

    const getWeekPercent = (weekIdx: number) => weekPercents[weekIdx] ?? 0;

    return {
        getWeekPercent,
        cyclePercent,
        currentPercent,
        prevPercent,
        diff,
        goalTracking
    };
}
