import { useEffect, useState } from "react";
import { Cycle, Id, WeeklyTarget } from "../types";
import { GoalDraft, TargetDraft } from "../components/week/types";

type UseWeekTabEditingParams = {
    cycle: Cycle;
    totalWeeklyTargets: WeeklyTarget[];
    updateCycle: (updater: (prev: Cycle) => Cycle) => void;
    onUpdateWeeklyTarget: (targetId: Id, changes: Partial<WeeklyTarget>) => void;
};

export function useWeekTabEditing({
    cycle,
    totalWeeklyTargets,
    updateCycle,
    onUpdateWeeklyTarget
}: UseWeekTabEditingParams) {
    const [editingGoalId, setEditingGoalId] = useState<Id | null>(null);
    const [goalEditDraft, setGoalEditDraft] = useState<GoalDraft>({ title: "", metric: "" });
    const [editingTargetId, setEditingTargetId] = useState<Id | null>(null);
    const [targetEditDraft, setTargetEditDraft] = useState<TargetDraft>({ title: "", target: 1, unit: "" });

    useEffect(() => {
        if (editingGoalId && !cycle.goals.some((goal) => goal.id === editingGoalId)) {
            setEditingGoalId(null);
        }
    }, [cycle.goals, editingGoalId]);

    useEffect(() => {
        if (editingTargetId && !totalWeeklyTargets.some((target) => target.id === editingTargetId)) {
            setEditingTargetId(null);
        }
    }, [editingTargetId, totalWeeklyTargets]);

    const startGoalEdit = (goal: Cycle["goals"][number]) => {
        setEditingTargetId(null);
        setEditingGoalId(goal.id);
        setGoalEditDraft({
            title: goal.title,
            metric: goal.metric ?? ""
        });
    };

    const cancelGoalEdit = () => {
        setEditingGoalId(null);
    };

    const saveGoalEdit = () => {
        if (!editingGoalId) return;
        const nextTitle = goalEditDraft.title.trim();
        if (!nextTitle) return;

        updateCycle((prev) => ({
            ...prev,
            goals: prev.goals.map((item) =>
                item.id === editingGoalId
                    ? {
                        ...item,
                        title: nextTitle,
                        metric: goalEditDraft.metric.trim() || undefined
                    }
                    : item
            )
        }));
        setEditingGoalId(null);
    };

    const startTargetEdit = (target: WeeklyTarget) => {
        setEditingGoalId(null);
        setEditingTargetId(target.id);
        setTargetEditDraft({
            title: target.title,
            target: target.target,
            unit: target.unit ?? ""
        });
    };

    const cancelTargetEdit = () => {
        setEditingTargetId(null);
    };

    const saveTargetEdit = () => {
        if (!editingTargetId) return;
        const nextTitle = targetEditDraft.title.trim();
        if (!nextTitle) return;

        const nextTarget = Math.max(1, Math.floor(targetEditDraft.target || 1));
        onUpdateWeeklyTarget(editingTargetId, {
            title: nextTitle,
            target: nextTarget,
            unit: targetEditDraft.unit.trim() || undefined
        });
        setEditingTargetId(null);
    };

    return {
        editingGoalId,
        goalEditDraft,
        setGoalEditDraft,
        startGoalEdit,
        cancelGoalEdit,
        saveGoalEdit,
        setEditingGoalId,
        editingTargetId,
        targetEditDraft,
        setTargetEditDraft,
        startTargetEdit,
        cancelTargetEdit,
        saveTargetEdit,
        setEditingTargetId
    };
}
