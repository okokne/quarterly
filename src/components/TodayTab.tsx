import {
    Dispatch,
    SetStateAction,
    useState
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
    weekdayLabelLong
} from "../utils";
import { TodayOpenTargetsSection } from "./today/TodayOpenTargetsSection";
import { TodayHabitsSection } from "./today/TodayHabitsSection";
import { TodayDailyReviewSection } from "./today/TodayDailyReviewSection";
import { TodayDatePickerSection } from "./today/TodayDatePickerSection";
import { TodayBlocksSection } from "./today/TodayBlocksSection";

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
    const [dayPlanViewMode, setDayPlanViewMode] = useState<DayPlanViewMode>("list");

    return (
        <section className="card">
            <div className="section-title">
                <h2>{tr(language, "today.title")}</h2>
                <span className="muted">{weekdayLabelLong(selectedDate, language)} · {formatDate(selectedDate, dateFormat, language)}</span>
            </div>
            {isArchiveView && <p className="readonly-note">{tr(language, "app.archiveReadOnlyMode")}</p>}

            <TodayDatePickerSection
                language={language}
                dateFormat={dateFormat}
                cycle={cycle}
                setSelectedWeek={setSelectedWeek}
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
            />
            <div className="today-view-toggle-row">
                <div className="today-view-toggle" role="tablist" aria-label={tr(language, "today.viewToggleAria")}>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={dayPlanViewMode === "list"}
                        className={dayPlanViewMode === "list" ? "active" : ""}
                        onClick={() => setDayPlanViewMode("list")}
                    >
                        {tr(language, "today.viewList")}
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={dayPlanViewMode === "timeline"}
                        className={dayPlanViewMode === "timeline" ? "active" : ""}
                        onClick={() => setDayPlanViewMode("timeline")}
                    >
                        {tr(language, "today.viewTimeline")}
                    </button>
                </div>
            </div>

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
                    dayPlanViewMode={dayPlanViewMode}
                    setDayPlanViewMode={setDayPlanViewMode}
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
