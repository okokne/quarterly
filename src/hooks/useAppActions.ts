import { Dispatch, SetStateAction, useCallback } from "react";
import { Cycle, DailyBlock, DailyTemplate, Id, WeeklyTarget } from "../types";
import { uid } from "../utils";
import { WeeklyTargetDraft } from "./useWeeklyTargets";
import {
    DEFAULT_WEEKLY_TARGET_ACCENT,
    normalizeWeeklyTargetAccent,
    WEEKLY_TARGET_ACCENT_PALETTE
} from "../utils/weeklyTargetAccents";

type GoalDraft = {
    title: string;
    metric: string;
};

type UseAppActionsParams = {
    cycle: Cycle | null;
    goalDraft: GoalDraft;
    setGoalDraft: Dispatch<SetStateAction<GoalDraft>>;
    updateCycle: (updater: (prev: Cycle) => Cycle) => void;
    selectedWeek: number;
    targetDraft: WeeklyTargetDraft;
    setTargetDraft: Dispatch<SetStateAction<WeeklyTargetDraft>>;
    addWeeklyTarget: (selectedWeek: number, draft: WeeklyTargetDraft) => boolean;
    updateWeeklyTarget: (selectedWeek: number, targetId: Id, changes: Partial<WeeklyTarget>) => void;
    adjustWeeklyTarget: (selectedWeek: number, targetId: Id, delta: number) => void;
    deleteWeeklyTarget: (selectedWeek: number, targetId: Id) => void;
    copyFromPreviousWeek: (selectedWeek: number) => void;
    saveAsTemplate: (name: string, dayBlocks: DailyBlock[]) => boolean;
    dayBlocks: DailyBlock[];
    setTemplateNameDraft: Dispatch<SetStateAction<string>>;
    setShowTemplateModal: Dispatch<SetStateAction<boolean>>;
    loadTemplate: (template: DailyTemplate) => void;
    deleteTemplate: (templateId: Id) => void;
};

export function useAppActions({
    cycle,
    goalDraft,
    setGoalDraft,
    updateCycle,
    selectedWeek,
    targetDraft,
    setTargetDraft,
    addWeeklyTarget,
    updateWeeklyTarget,
    adjustWeeklyTarget,
    deleteWeeklyTarget,
    copyFromPreviousWeek,
    saveAsTemplate,
    dayBlocks,
    setTemplateNameDraft,
    setShowTemplateModal,
    loadTemplate,
    deleteTemplate
}: UseAppActionsParams) {
    const handleAddGoal = useCallback(() => {
        if (!cycle) return;
        if (!goalDraft.title.trim()) return;

        updateCycle((prev) => ({
            ...prev,
            goals: [
                ...prev.goals,
                {
                    id: uid(),
                    title: goalDraft.title.trim(),
                    metric: goalDraft.metric.trim() || undefined,
                    color: WEEKLY_TARGET_ACCENT_PALETTE[prev.goals.length % WEEKLY_TARGET_ACCENT_PALETTE.length]
                }
            ]
        }));
        setGoalDraft({ title: "", metric: "" });
    }, [cycle, goalDraft, setGoalDraft, updateCycle]);

    const handleDeleteGoal = useCallback((goalId: Id) => {
        updateCycle((prev) => {
            const goalIndex = prev.goals.findIndex((goal) => goal.id === goalId);
            const fallbackAccent = WEEKLY_TARGET_ACCENT_PALETTE[
                (goalIndex >= 0 ? goalIndex : 0) % WEEKLY_TARGET_ACCENT_PALETTE.length
            ];
            const nextWeeklyTargets: Cycle["weeklyTargets"] = {};
            Object.entries(prev.weeklyTargets).forEach(([weekKey, targets]) => {
                const weekIndex = Number.parseInt(weekKey, 10);
                if (!Number.isInteger(weekIndex)) return;
                nextWeeklyTargets[weekIndex] = targets.map((target) => {
                    if (target.goalId !== goalId) return target;
                    return {
                        ...target,
                        goalId: undefined,
                        color: normalizeWeeklyTargetAccent(target.color) ?? fallbackAccent
                    };
                });
            });

            return {
                ...prev,
                goals: prev.goals.filter((g) => g.id !== goalId),
                weeklyTargets: nextWeeklyTargets
            };
        });
    }, [updateCycle]);

    const handleAddWeeklyTarget = useCallback(() => {
        const didAdd = addWeeklyTarget(selectedWeek, targetDraft);
        if (didAdd) {
            setTargetDraft({ title: "", target: 1, unit: "", color: DEFAULT_WEEKLY_TARGET_ACCENT, goalId: "" });
        }
        return didAdd;
    }, [addWeeklyTarget, selectedWeek, setTargetDraft, targetDraft]);

    const handleUpdateWeeklyTarget = useCallback((targetId: Id, changes: Partial<WeeklyTarget>) => {
        updateWeeklyTarget(selectedWeek, targetId, changes);
    }, [selectedWeek, updateWeeklyTarget]);

    const handleDeleteWeeklyTarget = useCallback((targetId: Id) => {
        deleteWeeklyTarget(selectedWeek, targetId);
    }, [deleteWeeklyTarget, selectedWeek]);

    const handleAdjustWeeklyTarget = useCallback((targetId: Id, delta: number) => {
        adjustWeeklyTarget(selectedWeek, targetId, delta);
    }, [adjustWeeklyTarget, selectedWeek]);

    const handleCopyFromPreviousWeek = useCallback(() => {
        copyFromPreviousWeek(selectedWeek);
    }, [copyFromPreviousWeek, selectedWeek]);

    const handleSaveAsTemplate = useCallback((name: string) => {
        const didSave = saveAsTemplate(name, dayBlocks);
        if (didSave) {
            setTemplateNameDraft("");
            setShowTemplateModal(false);
        }
    }, [dayBlocks, saveAsTemplate, setShowTemplateModal, setTemplateNameDraft]);

    const handleLoadTemplate = useCallback((template: DailyTemplate) => {
        loadTemplate(template);
    }, [loadTemplate]);

    const handleDeleteTemplate = useCallback((templateId: Id) => {
        deleteTemplate(templateId);
    }, [deleteTemplate]);

    return {
        handleAddGoal,
        handleDeleteGoal,
        handleAddWeeklyTarget,
        handleUpdateWeeklyTarget,
        handleAdjustWeeklyTarget,
        handleDeleteWeeklyTarget,
        handleCopyFromPreviousWeek,
        handleSaveAsTemplate,
        handleLoadTemplate,
        handleDeleteTemplate
    };
}
