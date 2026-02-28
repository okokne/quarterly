import { Dispatch, SetStateAction, useCallback, useState } from "react";
import { t as tr } from "../i18n";
import { AppTab } from "../navigation";
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
    WeeklyTarget,
    Book
} from "../types";
import { buildCycle } from "../utils";
import { JournalView } from "./JournalView";
import { OnboardingPanel } from "./OnboardingPanel";
import { PlanTab } from "./PlanTab";
import { StatsView } from "./StatsView";
import { TodayTab } from "./TodayTab";
import { WeekTab } from "./WeekTab";
import { BooksTab } from "./books/BooksTab";

type GoalDraft = {
    title: string;
    metric: string;
};

type TargetDraft = {
    title: string;
    target: number;
    unit: string;
    color: string;
    goalId: string;
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
    currentWeekIndex: number;
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
    books: Book[];
    onAddBook: (title: string, author?: string, coverUrl?: string, categories?: string[], totalPages?: number, status?: "want_to_read" | "reading" | "finished") => void;
    onUpdateBook: (id: string, updates: Partial<Book>) => void;
    onDeleteBook: (id: string) => void;
    onAddSession: (bookId: string, pagesRead: number, durationMinutes?: number, notes?: string) => void;
    dailyReview: DailyReview;
    weeklyReview: WeeklyReview;
    showReminder: boolean;
    history: Cycle[];
    updateCycle: (updater: (prev: Cycle) => Cycle) => void;
    onAddGoal: () => void;
    onDeleteGoal: (goalId: Id) => void;
    onAddWeeklyTarget: () => boolean;
    onCopyFromPreviousWeek: () => void;
    onUpdateWeeklyTarget: (targetId: Id, changes: Partial<WeeklyTarget>) => void;
    onAdjustWeeklyTarget: (targetId: Id, delta: number) => void;
    onDeleteWeeklyTarget: (targetId: Id) => void;
    onReorderTargets: (weekIndex: number, fromIndex: number, toIndex: number) => void;
    onAddBlock: (date: string, draftOverride?: DailyBlockDraft) => boolean | Promise<boolean>;
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
    onOpenLabelSettings: (contextId?: string) => void;
    onViewArchivedCycle: (id: Id) => void;
    onDeleteArchivedCycle: (id: Id) => void;
    onArchiveRestart: () => void;
    todayComposerRequest: { id: number; mode: "timed" | "flexible" } | null;
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
    currentWeekIndex,
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
    books,
    onAddBook,
    onUpdateBook,
    onDeleteBook,
    onAddSession,
    dailyReview,
    weeklyReview,
    showReminder,
    history,
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
    onOpenCycleDrawer,
    onOpenLabelSettings,
    onViewArchivedCycle,
    onDeleteArchivedCycle,
    onArchiveRestart,
    todayComposerRequest
}: AppDashboardContentProps) {
    const onboardingDone = step >= 4;
    const [weekFocusTargetId, setWeekFocusTargetId] = useState<Id | null>(null);
    const handleOpenWeekFromToday = useCallback((targetId?: Id) => {
        setWeekFocusTargetId(targetId ?? null);
        setActiveTab("week");
    }, [setActiveTab]);
    const handleWeekFocusHandled = useCallback(() => {
        setWeekFocusTargetId(null);
    }, []);

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
                    onOpenWeekTarget={handleOpenWeekFromToday}
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
                    habits={habits}
                    getActiveHabitsForDate={getActiveHabitsForDate}
                    habitLog={habitLog}
                    onToggleHabit={onToggleHabit}
                    onDeleteHabit={onDeleteHabit}
                    onOpenHabitsManager={onOpenHabitsManager}
                    dailyReview={dailyReview}
                    updateCycle={updateCycle}
                    composerRequest={todayComposerRequest}
                />
            )}

            {onboardingDone && activeTab === "week" && (
                <WeekTab
                    cycle={cycle}
                    language={language}
                    dateFormat={dateFormat}
                    isArchiveView={isArchiveView}
                    currentWeekIndex={currentWeekIndex}
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
                    focusTargetId={activeTab === "week" ? weekFocusTargetId : null}
                    onFocusTargetHandled={handleWeekFocusHandled}
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

            {onboardingDone && activeTab === "inbox" && (
                <JournalView
                    cycle={cycle}
                    language={language}
                    dateFormat={dateFormat}
                    readOnly={isArchiveView}
                    setSelectedWeek={setSelectedWeek}
                    setSelectedDate={setSelectedDate}
                    setActiveTab={setActiveTab}
                    updateCycle={updateCycle}
                    onOpenLabelSettings={onOpenLabelSettings}
                />
            )}

            {onboardingDone && activeTab === "books" && (
                <BooksTab
                    language={language}
                    books={books}
                    onAddBook={onAddBook}
                    onUpdateBook={onUpdateBook}
                    onDeleteBook={onDeleteBook}
                    onAddSession={onAddSession}
                />
            )}

            {onboardingDone && activeTab === "plan" && (
                <PlanTab
                    cycle={cycle}
                    language={language}
                    dateFormat={dateFormat}
                    isArchiveView={isArchiveView}
                    history={history}
                    habits={habits}
                    setSelectedWeek={setSelectedWeek}
                    setActiveTab={setActiveTab}
                    updateCycle={updateCycle}
                    onOpenHabitsManager={onOpenHabitsManager}
                    onViewArchivedCycle={onViewArchivedCycle}
                    onDeleteArchivedCycle={onDeleteArchivedCycle}
                    onArchiveRestart={onArchiveRestart}
                />
            )}
        </>
    );
}
