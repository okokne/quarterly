import { Dispatch, SetStateAction } from "react";
import { t as tr } from "../i18n";
import { DailyBlockDraft } from "../hooks/useDailyBlocks";
import {
    AppLanguage,
    Cycle,
    DailyBlock,
    DailyReview,
    DailyTemplate,
    DateFormat,
    Habit,
    Id,
    TimeFormat,
    WeeklyReview,
    WeeklyTarget
} from "../types";
import { buildCycle } from "../utils";
import { AppTab, AppTabs } from "./AppTabs";
import { JournalView } from "./JournalView";
import { OnboardingPanel } from "./OnboardingPanel";
import { StatsView } from "./StatsView";
import { TodayTab } from "./TodayTab";
import { WeekTab } from "./WeekTab";

type GoalDraft = {
    title: string;
    metric: string;
};

type TargetDraft = {
    title: string;
    target: number;
    unit: string;
};

type AppDashboardContentProps = {
    cycle: Cycle;
    language: AppLanguage;
    dateFormat: DateFormat;
    timeFormat: TimeFormat;
    isArchiveView: boolean;
    activeTab: AppTab;
    setActiveTab: (tab: AppTab) => void;
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
    onAddWeeklyTarget: () => boolean;
    onCopyFromPreviousWeek: () => void;
    onUpdateWeeklyTarget: (targetId: Id, changes: Partial<WeeklyTarget>) => void;
    onAdjustWeeklyTarget: (targetId: Id, delta: number) => void;
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
    onOpenCycleDrawer: () => void;
};

export function AppDashboardContent({
    cycle,
    language,
    dateFormat,
    timeFormat,
    isArchiveView,
    activeTab,
    setActiveTab,
    step,
    setStep,
    onboardingGoalsComplete,
    goalDraft,
    setGoalDraft,
    targetDraft,
    setTargetDraft,
    blockDraft,
    setBlockDraft,
    selectedDate,
    setSelectedDate,
    selectedWeek,
    setSelectedWeek,
    selectedWeekTargets,
    totalWeeklyTargets,
    dayBlocks,
    templates,
    draggingBlockId,
    setDraggingBlockId,
    draggingTargetId,
    setDraggingTargetId,
    habits,
    habitLog,
    dailyReview,
    weeklyReview,
    showReminder,
    updateCycle,
    onAddGoal,
    onDeleteGoal,
    onAddWeeklyTarget,
    onCopyFromPreviousWeek,
    onUpdateWeeklyTarget,
    onAdjustWeeklyTarget,
    onDeleteWeeklyTarget,
    onReorderTargets,
    onAddBlock,
    onOpenTemplateModal,
    onLoadTemplate,
    onDeleteTemplate,
    onReorderBlocks,
    onUpdateBlock,
    onDeleteBlock,
    getWeeklyRemaining,
    totalWeeklyDone,
    getActiveHabitsForDate,
    onToggleHabit,
    onDeleteHabit,
    onOpenHabitsManager,
    onOpenCycleDrawer
}: AppDashboardContentProps) {
    const onboardingDone = step >= 4;

    return (
        <>
            {showReminder && (
                <section className="banner">{tr(language, "app.bannerReminder")}</section>
            )}

            {!onboardingDone && (
                <OnboardingPanel
                    cycle={cycle}
                    language={language}
                    step={step}
                    setStep={setStep}
                    goalDraft={goalDraft}
                    setGoalDraft={setGoalDraft}
                    onboardingGoalsComplete={onboardingGoalsComplete}
                    onStartDateChange={(date) => updateCycle((prev) => buildCycle(prev.title ?? "", date))}
                    onAddGoal={onAddGoal}
                    onDeleteGoal={onDeleteGoal}
                    updateCycle={updateCycle}
                    onComplete={() => {
                        setStep(4);
                        setActiveTab("week");
                    }}
                />
            )}

            {onboardingDone && (
                <AppTabs
                    language={language}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                />
            )}

            {isArchiveView && (
                <section className="banner readonly-banner">{tr(language, "app.archiveReadOnlyMode")}</section>
            )}

            {onboardingDone && activeTab === "today" && (
                <TodayTab
                    cycle={cycle}
                    language={language}
                    dateFormat={dateFormat}
                    timeFormat={timeFormat}
                    isArchiveView={isArchiveView}
                    selectedDate={selectedDate}
                    setSelectedDate={setSelectedDate}
                    selectedWeek={selectedWeek}
                    setSelectedWeek={setSelectedWeek}
                    selectedWeekTargets={selectedWeekTargets}
                    blockDraft={blockDraft}
                    setBlockDraft={setBlockDraft}
                    dayBlocks={dayBlocks}
                    templates={templates}
                    onAddBlock={onAddBlock}
                    onOpenTemplateModal={onOpenTemplateModal}
                    onLoadTemplate={onLoadTemplate}
                    onDeleteTemplate={onDeleteTemplate}
                    draggingBlockId={draggingBlockId}
                    setDraggingBlockId={setDraggingBlockId}
                    onReorderBlocks={onReorderBlocks}
                    onUpdateBlock={onUpdateBlock}
                    onDeleteBlock={onDeleteBlock}
                    getWeeklyRemaining={getWeeklyRemaining}
                    getActiveHabitsForDate={getActiveHabitsForDate}
                    habitLog={habitLog}
                    onToggleHabit={onToggleHabit}
                    onDeleteHabit={onDeleteHabit}
                    onOpenHabitsManager={onOpenHabitsManager}
                    dailyReview={dailyReview}
                    updateCycle={updateCycle}
                />
            )}

            {onboardingDone && activeTab === "week" && (
                <WeekTab
                    cycle={cycle}
                    language={language}
                    dateFormat={dateFormat}
                    isArchiveView={isArchiveView}
                    selectedWeek={selectedWeek}
                    setSelectedWeek={setSelectedWeek}
                    updateCycle={updateCycle}
                    targetDraft={targetDraft}
                    setTargetDraft={setTargetDraft}
                    onAddWeeklyTarget={onAddWeeklyTarget}
                    onCopyFromPreviousWeek={onCopyFromPreviousWeek}
                    totalWeeklyTargets={totalWeeklyTargets}
                    draggingTargetId={draggingTargetId}
                    setDraggingTargetId={setDraggingTargetId}
                    onReorderTargets={onReorderTargets}
                    onUpdateWeeklyTarget={onUpdateWeeklyTarget}
                    onAdjustWeeklyTarget={onAdjustWeeklyTarget}
                    onDeleteWeeklyTarget={onDeleteWeeklyTarget}
                    totalWeeklyDone={totalWeeklyDone}
                    weeklyReview={weeklyReview}
                    onOpenCycleDrawer={onOpenCycleDrawer}
                />
            )}

            {onboardingDone && activeTab === "stats" && (
                <StatsView
                    cycle={cycle}
                    habits={habits}
                    habitLog={habitLog}
                    onToggleHabitForDate={onToggleHabit}
                    onDeleteHabit={onDeleteHabit}
                    readOnly={isArchiveView}
                    language={language}
                    setSelectedWeek={setSelectedWeek}
                    setActiveTab={setActiveTab}
                    onOpenHabitsManager={onOpenHabitsManager}
                    onOpenCycleDrawer={onOpenCycleDrawer}
                />
            )}

            {onboardingDone && activeTab === "journal" && (
                <JournalView
                    cycle={cycle}
                    language={language}
                    dateFormat={dateFormat}
                    readOnly={isArchiveView}
                    setSelectedWeek={setSelectedWeek}
                    setSelectedDate={setSelectedDate}
                    setActiveTab={setActiveTab}
                    updateCycle={updateCycle}
                />
            )}
        </>
    );
}
