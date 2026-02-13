import {
    Dispatch,
    SetStateAction
} from "react";
import { DailyBlockDraft } from "../hooks/useDailyBlocks";
import { t as tr } from "../i18n";
import {
    AppLanguage,
    Cycle,
    DailyBlock,
    DailyReview,
    DailyTemplate,
    DateFormat,
    Id,
    TimeFormat,
    WeeklyTarget
} from "../types";
import {
    formatDate,
    weekdayLabel
} from "../utils";
import { TodayOpenTargetsSection } from "./today/TodayOpenTargetsSection";
import { TodayHabitsSection } from "./today/TodayHabitsSection";
import { TodayDailyReviewSection } from "./today/TodayDailyReviewSection";
import { TodayDatePickerSection } from "./today/TodayDatePickerSection";
import { TodayBlocksSection } from "./today/TodayBlocksSection";

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
    weekCompletion: { done: number; total: number; percent: number };
    selectedWeekTargets: WeeklyTarget[];
    blockDraft: DailyBlockDraft;
    setBlockDraft: Dispatch<SetStateAction<DailyBlockDraft>>;
    dayBlocks: DailyBlock[];
    templates: DailyTemplate[];
    onAddBlock: (date: string) => void | Promise<void>;
    onOpenTemplateModal: () => void;
    onLoadTemplate: (template: DailyTemplate) => void;
    onDeleteTemplate: (templateId: Id) => void;
    draggingBlockId: Id | null;
    setDraggingBlockId: Dispatch<SetStateAction<Id | null>>;
    onReorderBlocks: (date: string, fromIndex: number, toIndex: number) => void;
    onUpdateBlock: (date: string, blockId: Id, changes: Partial<DailyBlock>) => void | Promise<void>;
    onDeleteBlock: (date: string, blockId: Id) => void | Promise<void>;
    getWeeklyRemaining: (weekIndex: number) => Array<WeeklyTarget & { remaining: number }>;
    getActiveHabitsForDate: (date: string) => Array<{ id: Id; title: string; emoji: string }>;
    habitLog: Record<string, string[]>;
    onToggleHabit: (date: string, habitId: Id) => void;
    onDeleteHabit: (habitId: Id) => void;
    onOpenHabitsManager: () => void;
    dailyReview: DailyReview;
    updateCycle: (updater: (prev: Cycle) => Cycle) => void;
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
    weekCompletion,
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
    getActiveHabitsForDate,
    habitLog,
    onToggleHabit,
    onDeleteHabit,
    onOpenHabitsManager,
    dailyReview,
    updateCycle
}: TodayTabProps) {
    const cycleEndDate = cycle.weeks[cycle.weeks.length - 1]?.endDate ?? cycle.startDate;
    const isDateWithinCycle = selectedDate >= cycle.startDate && selectedDate <= cycleEndDate;
    const activeWeekTargets = isDateWithinCycle ? selectedWeekTargets : [];

    return (
        <section className="card">
            <div className="section-title">
                <h2>{tr(language, "today.title")}</h2>
                <span className="muted">{weekdayLabel(selectedDate, language)} · {formatDate(selectedDate, dateFormat, language)}</span>
            </div>
            {isArchiveView && <p className="readonly-note">{tr(language, "app.archiveReadOnlyMode")}</p>}

            <TodayDatePickerSection
                language={language}
                dateFormat={dateFormat}
                cycle={cycle}
                setSelectedWeek={setSelectedWeek}
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
                weekCompletion={isDateWithinCycle ? weekCompletion : { done: 0, total: 0, percent: 0 }}
            />

            <fieldset className="readonly-fieldset" disabled={isArchiveView}>
                <TodayBlocksSection
                    language={language}
                    timeFormat={timeFormat}
                    isArchiveView={isArchiveView}
                    selectedDate={selectedDate}
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
                />

                <TodayOpenTargetsSection
                    language={language}
                    selectedWeek={selectedWeek}
                    selectedWeekTargets={activeWeekTargets}
                    getWeeklyRemaining={getWeeklyRemaining}
                />

                <TodayHabitsSection
                    language={language}
                    isArchiveView={isArchiveView}
                    selectedDate={selectedDate}
                    habitLog={habitLog}
                    getActiveHabitsForDate={getActiveHabitsForDate}
                    onToggleHabit={onToggleHabit}
                    onDeleteHabit={onDeleteHabit}
                    onOpenHabitsManager={onOpenHabitsManager}
                />

                <TodayDailyReviewSection
                    language={language}
                    dateFormat={dateFormat}
                    selectedDate={selectedDate}
                    dayBlocks={dayBlocks}
                    dailyReview={dailyReview}
                    updateCycle={updateCycle}
                />
            </fieldset>
        </section>
    );
}
