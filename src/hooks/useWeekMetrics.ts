import { useCallback, useMemo } from "react";
import { Cycle, Id } from "../types";
import { getDatesInWeek } from "../utils";

type WeekCompletion = {
    done: number;
    total: number;
    percent: number;
};

type UseWeekMetricsParams = {
    cycle: Cycle | null;
    selectedWeek: number;
};

export function useWeekMetrics({ cycle, selectedWeek }: UseWeekMetricsParams) {
    const totalWeeklyDone = useCallback((weekIndex: number, targetId: Id): number => {
        if (!cycle) return 0;

        const week = cycle.weeks.find((item) => item.index === weekIndex);
        if (!week) return 0;

        const dates = getDatesInWeek(week);
        return dates.reduce((sum, date) => {
            const blocks = cycle.dailyPlans[date] ?? [];
            return sum + blocks
                .filter((block) => block.linkedTargetId === targetId)
                .reduce((acc, block) => acc + (block.actual ?? (block.done ? 1 : 0)), 0);
        }, 0);
    }, [cycle]);

    const getWeeklyRemaining = useCallback((weekIndex: number) => {
        if (!cycle) return [];
        return (cycle.weeklyTargets[weekIndex] ?? []).map((target) => ({
            ...target,
            remaining: Math.max(0, target.target - target.done)
        }));
    }, [cycle]);

    const weekCompletion = useMemo<WeekCompletion>(() => {
        if (!cycle) return { done: 0, total: 0, percent: 0 };

        const targets = cycle.weeklyTargets[selectedWeek] ?? [];
        if (targets.length === 0) return { done: 0, total: 0, percent: 0 };

        let totalDone = 0;
        let totalTarget = 0;

        targets.forEach((target) => {
            const autoDone = totalWeeklyDone(selectedWeek, target.id);
            const done = Math.max(target.done, autoDone);
            totalDone += Math.min(done, target.target);
            totalTarget += target.target;
        });

        const percent = totalTarget > 0 ? Math.round((totalDone / totalTarget) * 100) : 0;
        return { done: totalDone, total: totalTarget, percent };
    }, [cycle, selectedWeek, totalWeeklyDone]);

    return {
        weekCompletion,
        totalWeeklyDone,
        getWeeklyRemaining
    };
}
