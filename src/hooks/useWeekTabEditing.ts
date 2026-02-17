import { useEffect, useMemo, useState } from "react";
import { Goal, Id, WeeklyTarget } from "../types";
import { TargetDraft } from "../components/week/types";
import {
    buildGoalAccentMap,
    DEFAULT_WEEKLY_TARGET_ACCENT,
    normalizeWeeklyTargetAccent
} from "../utils/weeklyTargetAccents";

type UseWeekTabEditingParams = {
    goals: Goal[];
    totalWeeklyTargets: WeeklyTarget[];
    onUpdateWeeklyTarget: (targetId: Id, changes: Partial<WeeklyTarget>) => void;
};

export function useWeekTabEditing({
    goals,
    totalWeeklyTargets,
    onUpdateWeeklyTarget
}: UseWeekTabEditingParams) {
    const goalAccentById = useMemo(() => buildGoalAccentMap(goals), [goals]);
    const [editingTargetId, setEditingTargetId] = useState<Id | null>(null);
    const [targetEditDraft, setTargetEditDraft] = useState<TargetDraft>({
        title: "",
        target: 1,
        unit: "",
        color: DEFAULT_WEEKLY_TARGET_ACCENT,
        goalId: ""
    });

    useEffect(() => {
        if (editingTargetId && !totalWeeklyTargets.some((target) => target.id === editingTargetId)) {
            setEditingTargetId(null);
        }
    }, [editingTargetId, totalWeeklyTargets]);

    const startTargetEdit = (target: WeeklyTarget) => {
        const linkedGoalId = target.goalId ? String(target.goalId) : "";
        const linkedGoalAccent = linkedGoalId ? goalAccentById.get(linkedGoalId) : undefined;
        setEditingTargetId(target.id);
        setTargetEditDraft({
            title: target.title,
            target: target.target,
            unit: target.unit ?? "",
            color: linkedGoalAccent ?? normalizeWeeklyTargetAccent(target.color) ?? DEFAULT_WEEKLY_TARGET_ACCENT,
            goalId: linkedGoalId
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
        const nextGoalId = targetEditDraft.goalId.trim() || undefined;
        const linkedGoalAccent = nextGoalId ? goalAccentById.get(nextGoalId) : undefined;
        onUpdateWeeklyTarget(editingTargetId, {
            title: nextTitle,
            target: nextTarget,
            unit: targetEditDraft.unit.trim() || undefined,
            color: linkedGoalAccent ?? normalizeWeeklyTargetAccent(targetEditDraft.color) ?? DEFAULT_WEEKLY_TARGET_ACCENT,
            goalId: nextGoalId
        });
        setEditingTargetId(null);
    };

    return {
        editingTargetId,
        targetEditDraft,
        setTargetEditDraft,
        startTargetEdit,
        cancelTargetEdit,
        saveTargetEdit,
        setEditingTargetId
    };
}
