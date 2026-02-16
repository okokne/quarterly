import {
    Dispatch,
    SetStateAction,
    useEffect,
    useMemo,
    useState
} from "react";
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
    Id,
    TimeFormat,
    WeeklyTarget
} from "../types";
import {
    formatDate,
    getEffectiveWeeklyDone,
    getWeekProgressPercent,
    parseIso,
    weekdayLabelLong
} from "../utils";
import { ProgressBar } from "./ProgressBar";
import { ProgressRing } from "./ProgressRing";
import { TodayOpenTargetsSection } from "./today/TodayOpenTargetsSection";
import { TodayHabitsSection } from "./today/TodayHabitsSection";
import { TodayDailyReviewSection } from "./today/TodayDailyReviewSection";
import { TodayDatePickerSection } from "./today/TodayDatePickerSection";
import { TodayBlocksSection } from "./today/TodayBlocksSection";
import { ArrowRight, BarChart3, Moon, Sunrise } from "./ui/icons";
import { Icon } from "./ui/Icon";
import { resolveHabitIcon } from "./ui/habitIcons";

type DayPlanViewMode = "list" | "timeline";
type DaylightPhase = "day" | "night";

function getDayOfYear(date: Date): number {
    const start = new Date(date.getFullYear(), 0, 0);
    const diffMs = date.getTime() - start.getTime();
    return Math.floor(diffMs / 86_400_000);
}

function resolveDaylightPhaseApprox(now: Date): DaylightPhase {
    // Approximation by local time + season curve (no geolocation permission needed).
    const dayOfYear = getDayOfYear(now);
    const seasonalOffset = Math.sin((2 * Math.PI * (dayOfYear - 80)) / 365.25);
    const daylightHours = 12 + (3.5 * seasonalOffset); // ~8.5h winter to ~15.5h summer
    const sunriseHour = 12 - (daylightHours / 2);
    const sunsetHour = 12 + (daylightHours / 2);
    const hourNow = now.getHours() + (now.getMinutes() / 60);

    return hourNow >= sunriseHour && hourNow < sunsetHour ? "day" : "night";
}

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
        () => dayBlocks.filter((block) => getBlockCompletionState({ amount: block.amount, actual: block.actual, done: block.done }).isDone).length,
        [dayBlocks]
    );
    const dayProgressPercent = dayBlocks.length > 0 ? Math.round((completedBlocks / dayBlocks.length) * 100) : 0;
    const remainingBlocks = Math.max(dayBlocks.length - completedBlocks, 0);
    const weekProgressPercent = getWeekProgressPercent(cycle, selectedWeek);
    const [daylightPhase, setDaylightPhase] = useState<DaylightPhase>("day");
    const activeHabitsForDate = useMemo(() => getActiveHabitsForDate(selectedDate), [getActiveHabitsForDate, selectedDate]);
    const quickHabits = activeHabitsForDate.slice(0, 7);
    const hiddenHabitCount = Math.max(activeHabitsForDate.length - quickHabits.length, 0);
    const doneHabitIds = habitLog[selectedDate] ?? [];
    const nextPriority = useMemo(() => {
        if (activeWeekTargets.length === 0) return null;

        return activeWeekTargets
            .map((target) => {
                const safeTarget = target.target > 0 ? target.target : 0;
                const done = getEffectiveWeeklyDone(cycle, selectedWeek, target);
                const percent = safeTarget > 0 ? Math.round((done / safeTarget) * 100) : 100;
                return {
                    target,
                    done,
                    percent
                };
            })
            .sort((a, b) => a.percent - b.percent || (b.target.target - a.target.target))
            [0];
    }, [activeWeekTargets, cycle, selectedWeek]);
    const nextPriorityDone = nextPriority
        ? (Number.isInteger(nextPriority.done) ? nextPriority.done : Number(nextPriority.done.toFixed(1)))
        : 0;
    const weekDayNumber = useMemo(() => {
        const selectedWeekData = cycle.weeks.find((week) => week.index === selectedWeek);
        if (!selectedWeekData) return ((parseIso(selectedDate).getDay() + 6) % 7) + 1;

        const selectedDay = parseIso(selectedDate);
        const weekStart = parseIso(selectedWeekData.startDate);
        const msInDay = 1000 * 60 * 60 * 24;
        const rawDiff = Math.floor((selectedDay.getTime() - weekStart.getTime()) / msInDay) + 1;
        return Math.max(1, Math.min(7, rawDiff));
    }, [cycle.weeks, selectedDate, selectedWeek]);
    const isWeekFullyDone = weekProgressPercent >= 100 && activeWeekTargets.length > 0;

    useEffect(() => {
        const updatePhase = () => {
            setDaylightPhase(resolveDaylightPhaseApprox(new Date()));
        };

        updatePhase();
        const intervalId = window.setInterval(updatePhase, 60_000);
        return () => window.clearInterval(intervalId);
    }, []);

    return (
        <section className="card">
            <div className="section-title">
                <h2>{tr(language, "today.title")}</h2>
                <span className="muted">{weekdayLabelLong(selectedDate, language)} · {formatDate(selectedDate, dateFormat, language)}</span>
            </div>
            {isArchiveView && <p className="readonly-note">{tr(language, "app.archiveReadOnlyMode")}</p>}

            <div className="today-hero-row">
                <article className={`subcard today-hero-card today-hero-card-progress ${dayProgressPercent >= 100 ? "is-complete" : ""}`}>
                    <div className="today-hero-watermark" aria-hidden="true">
                        <Icon icon={daylightPhase === "night" ? Moon : Sunrise} size={40} />
                    </div>
                    <div className="today-hero-mainline">
                        <div className="today-hero-progress-ring">
                            <ProgressRing value={dayProgressPercent} max={100} size={70} strokeWidth={6} />
                        </div>
                        <div className="today-hero-main">
                            <h3>{tr(language, "today.heroProgressTitle")}</h3>
                            <strong>{dayProgressPercent}%</strong>
                            <p className="muted">{tr(language, "today.heroRemaining", { count: remainingBlocks })}</p>
                        </div>
                    </div>
                    <div className="today-hero-habit-quick-access">
                        <span className="today-hero-secondary">{tr(language, "today.heroQuickHabits")}</span>
                        {activeHabitsForDate.length === 0 ? (
                            <p className="muted today-hero-habit-empty">{tr(language, "today.heroNoHabits")}</p>
                        ) : (
                            <div className="today-hero-habit-bubbles">
                                {quickHabits.map((habit) => {
                                    const done = doneHabitIds.includes(habit.id);
                                    return (
                                        <button
                                            key={habit.id}
                                            type="button"
                                            className={`today-hero-habit-bubble ${done ? "done" : ""}`}
                                            onClick={() => onToggleHabit(selectedDate, habit.id)}
                                            title={habit.title}
                                            disabled={isArchiveView}
                                            aria-label={habit.title}
                                        >
                                            <Icon icon={resolveHabitIcon(habit.emoji)} size={14} />
                                        </button>
                                    );
                                })}
                                {hiddenHabitCount > 0 && (
                                    <span className="today-hero-habit-overflow">+{hiddenHabitCount}</span>
                                )}
                            </div>
                        )}
                    </div>
                </article>
                <article className="subcard today-hero-card today-hero-card-week">
                    <div className="today-hero-watermark" aria-hidden="true">
                        <Icon icon={BarChart3} size={40} />
                    </div>
                    <h3>{tr(language, "today.heroWeekTitle")}</h3>
                    <strong>{weekProgressPercent}%</strong>
                    <ProgressBar value={weekProgressPercent} max={100} showLabel={false} />
                    <span className="today-hero-secondary">{tr(language, isWeekFullyDone ? "today.completedStatus" : "today.heroNextPriority")}</span>
                    <p className={`today-hero-priority-title ${isWeekFullyDone ? "complete" : ""}`}>
                        {isWeekFullyDone
                            ? tr(language, "today.heroWeekAllDone")
                            : nextPriority?.target.title ?? tr(language, "today.noWeekTargets")}
                    </p>
                    {!isWeekFullyDone && nextPriority && (
                        <p className="muted today-hero-priority-meta">
                            {tr(language, "week.targetProgressSimple", {
                                actual: nextPriorityDone,
                                target: nextPriority.target.target,
                                unit: nextPriority.target.unit ?? ""
                            })}
                        </p>
                    )}
                    <p className="muted today-hero-week-day">{tr(language, "today.heroWeekDay", { day: weekDayNumber })}</p>
                    <button
                        type="button"
                        className="today-hero-week-link"
                        onClick={() => onOpenWeekTarget(nextPriority?.target.id)}
                        title={tr(language, "today.heroOpenWeek")}
                        aria-label={tr(language, "today.heroOpenWeek")}
                    >
                        <Icon icon={ArrowRight} size={14} />
                    </button>
                </article>
            </div>

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
                    composerRequest={composerRequest}
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
