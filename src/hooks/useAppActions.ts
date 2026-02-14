import { Dispatch, SetStateAction, useCallback } from "react";
import { Cycle, DailyBlock, DailyTemplate, Id, WeeklyTarget } from "../types";
import { uid } from "../utils";
import { WeeklyTargetDraft } from "./useWeeklyTargets";

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
        if (cycle.goals.length >= 3) return;
        if (!goalDraft.title.trim()) return;

        updateCycle((prev) => ({
            ...prev,
            goals: [...prev.goals, { id: uid(), title: goalDraft.title.trim(), metric: goalDraft.metric.trim() || undefined }]
        }));
        setGoalDraft({ title: "", metric: "" });
    }, [cycle, goalDraft, setGoalDraft, updateCycle]);

    const handleDeleteGoal = useCallback((goalId: Id) => {
        updateCycle((prev) => ({
            ...prev,
            goals: prev.goals.filter((g) => g.id !== goalId)
        }));
    }, [updateCycle]);

    const handleAddWeeklyTarget = useCallback(() => {
        const didAdd = addWeeklyTarget(selectedWeek, targetDraft);
        if (didAdd) {
            setTargetDraft({ title: "", target: 1, unit: "" });
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
