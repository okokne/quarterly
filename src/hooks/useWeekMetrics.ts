import { useCallback, useMemo } from "react";
import { Cycle, Id, WeeklyTarget } from "../types";
import {
    getAutoDoneForTargetInWeek,
    getEffectiveWeeklyDone,
    getRemainingFromEffectiveDone,
    getWeekProgressPercent
} from "../utils";

type WeekCompletion = {
    percent: number;
    targetCount: number;
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
        if (!cycle) return { percent: 0, targetCount: 0 };
        return {
            percent: getWeekProgressPercent(cycle, selectedWeek),
            targetCount: (cycle.weeklyTargets[selectedWeek] ?? []).length
        };
    }, [cycle, selectedWeek]);

    return {
        weekCompletion,
        totalWeeklyDone,
        getEffectiveDone,
        getWeeklyRemaining
    };
}
