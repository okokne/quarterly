import { useEffect, useState } from "react";
import { Id, WeeklyTarget } from "../types";
import { TargetDraft } from "../components/week/types";
import { DEFAULT_WEEKLY_TARGET_ACCENT, normalizeWeeklyTargetAccent } from "../utils/weeklyTargetAccents";

type UseWeekTabEditingParams = {
    totalWeeklyTargets: WeeklyTarget[];
    onUpdateWeeklyTarget: (targetId: Id, changes: Partial<WeeklyTarget>) => void;
};

export function useWeekTabEditing({
    totalWeeklyTargets,
    onUpdateWeeklyTarget
}: UseWeekTabEditingParams) {
    const [editingTargetId, setEditingTargetId] = useState<Id | null>(null);
    const [targetEditDraft, setTargetEditDraft] = useState<TargetDraft>({
        title: "",
        target: 1,
        unit: "",
        color: DEFAULT_WEEKLY_TARGET_ACCENT
    });

    useEffect(() => {
        if (editingTargetId && !totalWeeklyTargets.some((target) => target.id === editingTargetId)) {
            setEditingTargetId(null);
        }
    }, [editingTargetId, totalWeeklyTargets]);

    const startTargetEdit = (target: WeeklyTarget) => {
        setEditingTargetId(target.id);
        setTargetEditDraft({
            title: target.title,
            target: target.target,
            unit: target.unit ?? "",
            color: normalizeWeeklyTargetAccent(target.color) ?? DEFAULT_WEEKLY_TARGET_ACCENT
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
            unit: targetEditDraft.unit.trim() || undefined,
            color: normalizeWeeklyTargetAccent(targetEditDraft.color) ?? DEFAULT_WEEKLY_TARGET_ACCENT
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
