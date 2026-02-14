import { useMemo } from "react";
import { Cycle } from "../types";
import { getEffectiveWeeklyDone, getWeekProgressPercent } from "../utils";

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

export function useStatsMetrics({ cycle, selectedWeek }: UseStatsMetricsParams) {
    const weekPercents = useMemo(() => {
        const percents: Record<number, number> = {};
        cycle.weeks.forEach((week) => {
            percents[week.index] = getWeekProgressPercent(cycle, week.index);
        });
        return percents;
    }, [cycle]);

    const cyclePercentValue = useMemo(() => {
        let cycleTotal = 0;
        let cycleDone = 0;

        cycle.weeks.forEach((week) => {
            const targets = cycle.weeklyTargets[week.index] ?? [];
            targets.forEach((target) => {
                const done = getEffectiveWeeklyDone(cycle, week.index, target);
                cycleDone += Math.min(done, target.target);
                cycleTotal += target.target;
            });
        });

        return cycleTotal > 0 ? Math.round((cycleDone / cycleTotal) * 100) : 0;
    }, [cycle]);

    const cyclePercent = `${cyclePercentValue}%`;

    const currentPercent = weekPercents[selectedWeek] ?? 0;
    const prevPercent = selectedWeek > 1 ? (weekPercents[selectedWeek - 1] ?? 0) : null;
    const diff = prevPercent !== null ? currentPercent - prevPercent : null;

    const goalTracking = useMemo<GoalTrackingItem[]>(() => {
        const targetMap = new Map<string, { title: string; unit: string; weeks: GoalTrackingWeek[] }>();

        cycle.weeks.forEach((week) => {
            const targets = cycle.weeklyTargets[week.index] ?? [];
            targets.forEach((target) => {
                const key = target.title.toLowerCase().trim();
                const done = getEffectiveWeeklyDone(cycle, week.index, target);

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
        cyclePercentValue,
        cyclePercent,
        currentPercent,
        prevPercent,
        diff,
        goalTracking
    };
}
