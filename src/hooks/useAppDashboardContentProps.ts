import { Dispatch, SetStateAction } from "react";
import { DailyBlockDraft } from "./useDailyBlocks";
import {
    Cycle,
    DailyBlock,
    DailyReview,
    DailyTemplate,
    Habit,
    Id,
    WeeklyReview,
    WeeklyTarget,
    AppLanguage,
    DateFormat,
    TimeFormat
} from "../types";

type Tab = "today" | "week" | "stats" | "journal";

type GoalDraft = {
    title: string;
    metric: string;
};

type TargetDraft = {
    title: string;
    target: number;
    unit: string;
};

type UseAppDashboardContentPropsParams = {
    cycle: Cycle;
    language: AppLanguage;
    dateFormat: DateFormat;
    timeFormat: TimeFormat;
    isArchiveView: boolean;
    activeTab: Tab;
    setActiveTab: (tab: Tab) => void;
    step: 1 | 2 | 3 | 4;
    setStep: Dispatch<SetStateAction<1 | 2 | 3 | 4>>;
    onboardingGoalsComplete: boolean;
    goalDraft: GoalDraft;
    setGoalDraft: Dispatch<SetStateAction<GoalDraft>>;
    targetDraft: TargetDraft;
    setTargetDraft: Dispatch<SetStateAction<TargetDraft>>;
    blockDraft: DailyBlockDraft;
    setBlockDraft: Dispatch<SetStateAction<DailyBlockDraft>>;
    selectedDate: string;
    setSelectedDate: Dispatch<SetStateAction<string>>;
    selectedWeek: number;
    setSelectedWeek: Dispatch<SetStateAction<number>>;
    weekCompletion: { done: number; total: number; percent: number };
    selectedWeekTargets: WeeklyTarget[];
    totalWeeklyTargets: WeeklyTarget[];
    dayBlocks: DailyBlock[];
    templates: DailyTemplate[];
    draggingBlockId: Id | null;
    setDraggingBlockId: Dispatch<SetStateAction<Id | null>>;
    draggingTargetId: Id | null;
    setDraggingTargetId: Dispatch<SetStateAction<Id | null>>;
    habits: Habit[];
    habitLog: Record<string, string[]>;
    dailyReview: DailyReview;
    weeklyReview: WeeklyReview;
    showReminder: boolean;
    updateCycle: (updater: (prev: Cycle) => Cycle) => void;
    onAddGoal: () => void;
    onDeleteGoal: (goalId: Id) => void;
    onAddWeeklyTarget: () => void;
    onCopyFromPreviousWeek: () => void;
    onUpdateWeeklyTarget: (targetId: Id, changes: Partial<WeeklyTarget>) => void;
    onDeleteWeeklyTarget: (targetId: Id) => void;
    onReorderTargets: (weekIndex: number, fromIndex: number, toIndex: number) => void;
    onAddBlock: (date: string) => void | Promise<void>;
    onOpenTemplateModal: () => void;
    onLoadTemplate: (template: DailyTemplate) => void;
    onDeleteTemplate: (templateId: Id) => void;
    onReorderBlocks: (date: string, fromIndex: number, toIndex: number) => void;
    onUpdateBlock: (date: string, blockId: Id, changes: Partial<DailyBlock>) => void | Promise<void>;
    onDeleteBlock: (date: string, blockId: Id) => void | Promise<void>;
    getWeeklyRemaining: (weekIndex: number) => Array<WeeklyTarget & { remaining: number }>;
    totalWeeklyDone: (weekIndex: number, targetId: Id) => number;
    getActiveHabitsForDate: (date: string) => Array<{ id: Id; title: string; emoji: string }>;
    onToggleHabit: (date: string, habitId: Id) => void;
    onDeleteHabit: (habitId: Id) => void;
    onOpenHabitsManager: () => void;
};

export function useAppDashboardContentProps(params: UseAppDashboardContentPropsParams) {
    return params;
}
