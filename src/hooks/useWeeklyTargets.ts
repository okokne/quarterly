import { Cycle, Id, WeeklyTarget } from "../types";
import { clamp, uid } from "../utils";
import { canReorderIndices } from "../regressionLogic";

export type WeeklyTargetDraft = {
    title: string;
    target: number;
    unit: string;
};

type UseWeeklyTargetsParams = {
    cycle: Cycle | null;
    updateCycle: (updater: (prev: Cycle) => Cycle) => void;
};

export function useWeeklyTargets({ cycle, updateCycle }: UseWeeklyTargetsParams) {
    const addWeeklyTarget = (selectedWeek: number, draft: WeeklyTargetDraft): boolean => {
        if (!draft.title.trim()) return false;

        updateCycle((prev) => {
            const targets = prev.weeklyTargets[selectedWeek] ?? [];
            const next = [
                ...targets,
                {
                    id: uid(),
                    title: draft.title.trim(),
                    target: clamp(draft.target || 1, 1, 9999),
                    unit: draft.unit.trim() || undefined,
                    manualAdjust: 0
                }
            ];
            return { ...prev, weeklyTargets: { ...prev.weeklyTargets, [selectedWeek]: next } };
        });

        return true;
    };

    const updateWeeklyTarget = (selectedWeek: number, targetId: Id, changes: Partial<WeeklyTarget>) => {
        updateCycle((prev) => {
            const targets = prev.weeklyTargets[selectedWeek] ?? [];
            return {
                ...prev,
                weeklyTargets: {
                    ...prev.weeklyTargets,
                    [selectedWeek]: targets.map((target) => (target.id === targetId ? { ...target, ...changes } : target))
                }
            };
        });
    };

    const adjustWeeklyTarget = (selectedWeek: number, targetId: Id, delta: number) => {
        if (!Number.isFinite(delta) || delta === 0) return;
        updateCycle((prev) => {
            const targets = prev.weeklyTargets[selectedWeek] ?? [];
            return {
                ...prev,
                weeklyTargets: {
                    ...prev.weeklyTargets,
                    [selectedWeek]: targets.map((target) => {
                        if (target.id !== targetId) return target;
                        const currentAdjust = target.manualAdjust ?? 0;
                        const nextAdjust = clamp(currentAdjust + delta, -target.target, target.target);
                        if (nextAdjust === currentAdjust) return target;
                        return { ...target, manualAdjust: nextAdjust };
                    })
                }
            };
        });
    };

    const deleteWeeklyTarget = (selectedWeek: number, targetId: Id) => {
        updateCycle((prev) => {
            const targets = prev.weeklyTargets[selectedWeek] ?? [];
            return {
                ...prev,
                weeklyTargets: {
                    ...prev.weeklyTargets,
                    [selectedWeek]: targets.filter((target) => target.id !== targetId)
                }
            };
        });
    };

    const reorderTargets = (weekIndex: number, fromIndex: number, toIndex: number) => {
        updateCycle((prev) => {
            const targets = [...(prev.weeklyTargets[weekIndex] ?? [])];
            if (!canReorderIndices({ fromIndex, toIndex, length: targets.length })) {
                return prev;
            }
            const [moved] = targets.splice(fromIndex, 1);
            if (!moved) return prev;
            targets.splice(toIndex, 0, moved);
            return {
                ...prev,
                weeklyTargets: { ...prev.weeklyTargets, [weekIndex]: targets }
            };
        });
    };

    const copyFromPreviousWeek = (selectedWeek: number) => {
        if (!cycle) return;
        if (selectedWeek <= 1) return;

        const previousTargets = cycle.weeklyTargets[selectedWeek - 1] ?? [];
        if (previousTargets.length === 0) return;

        const copiedTargets: WeeklyTarget[] = previousTargets.map((target) => ({
            id: crypto.randomUUID(),
            title: target.title,
            target: target.target,
            unit: target.unit,
            manualAdjust: 0,
            notes: target.notes
        }));

        updateCycle((prev) => ({
            ...prev,
            weeklyTargets: {
                ...prev.weeklyTargets,
                [selectedWeek]: [...(prev.weeklyTargets[selectedWeek] ?? []), ...copiedTargets]
            }
        }));
    };

    return {
        addWeeklyTarget,
        updateWeeklyTarget,
        adjustWeeklyTarget,
        deleteWeeklyTarget,
        reorderTargets,
        copyFromPreviousWeek
    };
}
