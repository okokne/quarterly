import { useCallback, useMemo } from "react";
import { Cycle, Id, WeeklyTarget } from "../types";
import { getAutoDoneForTargetInWeek, getEffectiveWeeklyDone, getRemainingFromEffectiveDone } from "../utils";

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
        return getAutoDoneForTargetInWeek(cycle, weekIndex, targetId);
    }, [cycle]);

    const getEffectiveDone = useCallback((weekIndex: number, target: WeeklyTarget) => {
        if (!cycle) return 0;
        return getEffectiveWeeklyDone(cycle, weekIndex, target);
    }, [cycle]);

    const getWeeklyRemaining = useCallback((weekIndex: number) => {
        if (!cycle) return [];
        return (cycle.weeklyTargets[weekIndex] ?? []).map((target) => ({
            ...target,
            remaining: getRemainingFromEffectiveDone(cycle, weekIndex, target)
        }));
    }, [cycle]);

    const weekCompletion = useMemo<WeekCompletion>(() => {
        if (!cycle) return { done: 0, total: 0, percent: 0 };

        const targets = cycle.weeklyTargets[selectedWeek] ?? [];
        if (targets.length === 0) return { done: 0, total: 0, percent: 0 };

        let totalDone = 0;
        let totalTarget = 0;

        targets.forEach((target) => {
            const done = getEffectiveDone(selectedWeek, target);
            totalDone += Math.min(done, target.target);
            totalTarget += target.target;
        });

        const percent = totalTarget > 0 ? Math.round((totalDone / totalTarget) * 100) : 0;
        return { done: totalDone, total: totalTarget, percent };
    }, [cycle, getEffectiveDone, selectedWeek]);

    return {
        weekCompletion,
        totalWeeklyDone,
        getEffectiveDone,
        getWeeklyRemaining
    };
}
