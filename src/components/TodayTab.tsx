import {
    Dispatch,
    SetStateAction,
    useEffect,
    useMemo,
    useState
} from "react";
import { MagnifyingGlass, ArrowsClockwise } from "@phosphor-icons/react";
import { DailyBlockDraft } from "../hooks/useDailyBlocks";
import { t as tr } from "../i18n";
import { getBlockCompletionState } from "../regressionLogic";
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
    WeeklyTarget
} from "../types";
import {
    getWeekProgressPercent,
    parseIso
} from "../utils";
import { TodayOpenTargetsSection } from "./today/TodayOpenTargetsSection";
import { TodayHabitsSection } from "./today/TodayHabitsSection";
import { TodayDailyReviewSection } from "./today/TodayDailyReviewSection";
import { TodayDatePickerSection } from "./today/TodayDatePickerSection";
import { TodayBlocksSection } from "./today/TodayBlocksSection";
import { SmartProgressOverview } from "./today/SmartProgressOverview";

type DayPlanViewMode = "list" | "timeline";

type TodayTabProps = {
    cycle: Cycle;
    language: AppLanguage;
    dateFormat: DateFormat;
    timeFormat: TimeFormat;
    isArchiveView: boolean;
    selectedDate: string;
    setSelectedDate: Dispatch<SetStateAction<string>>;
    selectedWeek: number;
    setSelectedWeek: Dispatch<SetStateAction<number>>;
    onOpenWeekTarget: (targetId?: Id) => void;
    selectedWeekTargets: WeeklyTarget[];
    blockDraft: DailyBlockDraft;
    setBlockDraft: Dispatch<SetStateAction<DailyBlockDraft>>;
    dayBlocks: DailyBlock[];
    templates: DailyTemplate[];
    onAddBlock: (date: string) => boolean | Promise<boolean>;
    onOpenTemplateModal: () => void;
    onLoadTemplate: (template: DailyTemplate) => void;
    onDeleteTemplate: (templateId: Id) => void;
    draggingBlockId: Id | null;
    setDraggingBlockId: Dispatch<SetStateAction<Id | null>>;
    onReorderBlocks: (date: string, fromIndex: number, toIndex: number) => void;
    onUpdateBlock: (date: string, blockId: Id, changes: Partial<DailyBlock>) => void | Promise<void>;
    onDeleteBlock: (date: string, blockId: Id) => void | Promise<void>;
    getWeeklyRemaining: (weekIndex: number) => Array<WeeklyTarget & { remaining: number }>;
    habits: Habit[];
    getActiveHabitsForDate: (date: string) => Array<{ id: Id; title: string; emoji: string }>;
    habitLog: Record<string, string[]>;
    onToggleHabit: (date: string, habitId: Id) => void;
    onDeleteHabit: (habitId: Id) => void;
    onOpenHabitsManager: () => void;
    dailyReview: DailyReview;
    updateCycle: (updater: (prev: Cycle) => Cycle) => void;
    composerRequest: { id: number; mode: "timed" | "flexible" } | null;
};

export function TodayTab({
    cycle,
    language,
    dateFormat,
    timeFormat,
    isArchiveView,
    selectedDate,
    setSelectedDate,
    selectedWeek,
    setSelectedWeek,
    onOpenWeekTarget,
    selectedWeekTargets,
    blockDraft,
    setBlockDraft,
    dayBlocks,
    templates,
    onAddBlock,
    onOpenTemplateModal,
    onLoadTemplate,
    onDeleteTemplate,
    draggingBlockId,
    setDraggingBlockId,
    onReorderBlocks,
    onUpdateBlock,
    onDeleteBlock,
    getWeeklyRemaining,
    habits,
    getActiveHabitsForDate,
    habitLog,
    onToggleHabit,
    onDeleteHabit,
    onOpenHabitsManager,
    dailyReview,
    updateCycle,
    composerRequest
}: TodayTabProps) {
    const cycleEndDate = cycle.weeks[cycle.weeks.length - 1]?.endDate ?? cycle.startDate;
    const isDateWithinCycle = selectedDate >= cycle.startDate && selectedDate <= cycleEndDate;
    const activeWeekTargets = isDateWithinCycle ? selectedWeekTargets : [];

    const [dayPlanViewMode, setDayPlanViewMode] = useState<DayPlanViewMode>("list");

    const completedBlocks = useMemo(
        () =>
            dayBlocks.filter(
                (block) =>
                    getBlockCompletionState({
                        amount: block.amount,
                        actual: block.actual,
                        done: block.done,
                    }).isDone
            ).length,
        [dayBlocks]
    );

    const dayProgressPercent =
        dayBlocks.length > 0 ? Math.round((completedBlocks / dayBlocks.length) * 100) : 0;

    const weekProgressPercent = getWeekProgressPercent(cycle, selectedWeek);

    const weekDayNumber = useMemo(() => {
        const selectedWeekData = cycle.weeks.find((week) => week.index === selectedWeek);
        if (!selectedWeekData)
            return ((parseIso(selectedDate).getDay() + 6) % 7) + 1;

        const selectedDay = parseIso(selectedDate);
        const weekStart = parseIso(selectedWeekData.startDate);
        const msInDay = 1000 * 60 * 60 * 24;
        const rawDiff =
            Math.floor((selectedDay.getTime() - weekStart.getTime()) / msInDay) + 1;
        return Math.max(1, Math.min(7, rawDiff));
    }, [cycle.weeks, selectedDate, selectedWeek]);

    void onOpenWeekTarget; // available for future use

    return (
        <section className="today-geist-root">
            <div className="today-geist-container">
                {/* ── Page Header ─────────────────────────────── */}
                <div className="today-geist-header">
                    <div>
                        <h2 className="today-geist-title">{tr(language, "today.title")}</h2>
                    </div>
                    <div className="today-geist-header-actions">
                        <button
                            type="button"
                            className="today-geist-ghost-btn"
                            aria-label="Search"
                            title="Search"
                        >
                            <MagnifyingGlass size={20} />
                        </button>
                        <button
                            type="button"
                            className="today-geist-ghost-btn"
                            aria-label="Sync"
                            title="Sync"
                        >
                            <ArrowsClockwise size={20} />
                        </button>
                    </div>
                </div>

                {isArchiveView && (
                    <p className="today-geist-readonly-note">
                        {tr(language, "app.archiveReadOnlyMode")}
                    </p>
                )}

                {/* ── Smart Progress Overview ─────────────────── */}
                <SmartProgressOverview
                    dayProgressPercent={dayProgressPercent}
                    weekProgressPercent={weekProgressPercent}
                    weekDayNumber={weekDayNumber}
                    selectedDate={selectedDate}
                    cycle={cycle}
                    selectedWeek={selectedWeek}
                    language={language}
                />

                {/* ── Week Calendar ───────────────────────────── */}
                <TodayDatePickerSection
                    language={language}
                    dateFormat={dateFormat}
                    cycle={cycle}
                    setSelectedWeek={setSelectedWeek}
                    selectedDate={selectedDate}
                    setSelectedDate={setSelectedDate}
                    dayPlanViewMode={dayPlanViewMode}
                    setDayPlanViewMode={setDayPlanViewMode}
                />

                <fieldset className="readonly-fieldset today-geist-fieldset" disabled={isArchiveView}>
                    {/* ── Tagesplan ──────────────────────────────── */}
                    <TodayBlocksSection
                        language={language}
                        timeFormat={timeFormat}
                        isArchiveView={isArchiveView}
                        selectedDate={selectedDate}
                        goals={cycle.goals}
                        selectedWeekTargets={activeWeekTargets}
                        blockDraft={blockDraft}
                        setBlockDraft={setBlockDraft}
                        dayBlocks={dayBlocks}
                        templates={templates}
                        draggingBlockId={draggingBlockId}
                        setDraggingBlockId={setDraggingBlockId}
                        onReorderBlocks={onReorderBlocks}
                        onAddBlock={onAddBlock}
                        onOpenTemplateModal={onOpenTemplateModal}
                        onLoadTemplate={onLoadTemplate}
                        onDeleteTemplate={onDeleteTemplate}
                        onUpdateBlock={onUpdateBlock}
                        onDeleteBlock={onDeleteBlock}
                        dayPlanViewMode={dayPlanViewMode}
                        setDayPlanViewMode={setDayPlanViewMode}
                        composerRequest={composerRequest}
                    />

                    {/* ── Diese Woche noch offen ─────────────────── */}
                    <TodayOpenTargetsSection
                        language={language}
                        selectedWeek={selectedWeek}
                        goals={cycle.goals}
                        selectedWeekTargets={activeWeekTargets}
                        getWeeklyRemaining={getWeeklyRemaining}
                    />

                    {/* ── Habits ─────────────────────────────────── */}
                    <TodayHabitsSection
                        language={language}
                        isArchiveView={isArchiveView}
                        selectedDate={selectedDate}
                        habits={habits}
                        habitLog={habitLog}
                        getActiveHabitsForDate={getActiveHabitsForDate}
                        onToggleHabit={onToggleHabit}
                        onDeleteHabit={onDeleteHabit}
                        onOpenHabitsManager={onOpenHabitsManager}
                    />

                    {/* ── Daily Review ────────────────────────────── */}
                    <TodayDailyReviewSection
                        language={language}
                        dateFormat={dateFormat}
                        selectedDate={selectedDate}
                        dayBlocks={dayBlocks}
                        dailyReview={dailyReview}
                        updateCycle={updateCycle}
                    />
                </fieldset>
            </div>
        </section>
    );
}
