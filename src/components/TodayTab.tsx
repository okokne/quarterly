import {
    Dispatch,
    SetStateAction,
    useEffect,
    useMemo,
    useState,
    useRef
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

const SUN_ZENITH_DEGREES = 90.833;

function normalizeDegrees(value: number): number {
    return ((value % 360) + 360) % 360;
}

function toRadians(value: number): number {
    return (value * Math.PI) / 180;
}

function toDegrees(value: number): number {
    return (value * 180) / Math.PI;
}

function getDayOfYear(date: Date): number {
    const start = new Date(date.getFullYear(), 0, 0);
    const diffMs = date.getTime() - start.getTime();
    return Math.floor(diffMs / 86_400_000);
}

function calculateSunEventUtc(date: Date, latitude: number, longitude: number, isSunrise: boolean): Date | null {
    const dayOfYear = getDayOfYear(date);
    const lngHour = longitude / 15;
    const approxTime = dayOfYear + (((isSunrise ? 6 : 18) - lngHour) / 24);
    const meanAnomaly = (0.9856 * approxTime) - 3.289;

    const trueLongitude = normalizeDegrees(
        meanAnomaly
        + (1.916 * Math.sin(toRadians(meanAnomaly)))
        + (0.020 * Math.sin(toRadians(2 * meanAnomaly)))
        + 282.634
    );

    let rightAscension = normalizeDegrees(toDegrees(Math.atan(0.91764 * Math.tan(toRadians(trueLongitude)))));
    const trueLongitudeQuadrant = Math.floor(trueLongitude / 90) * 90;
    const rightAscensionQuadrant = Math.floor(rightAscension / 90) * 90;
    rightAscension = (rightAscension + (trueLongitudeQuadrant - rightAscensionQuadrant)) / 15;

    const sinDeclination = 0.39782 * Math.sin(toRadians(trueLongitude));
    const cosDeclination = Math.cos(Math.asin(sinDeclination));
    const cosHourAngle = (
        Math.cos(toRadians(SUN_ZENITH_DEGREES))
        - (sinDeclination * Math.sin(toRadians(latitude)))
    ) / (cosDeclination * Math.cos(toRadians(latitude)));

    if (cosHourAngle > 1 || cosHourAngle < -1) {
        return null;
    }

    let hourAngle = isSunrise
        ? 360 - toDegrees(Math.acos(cosHourAngle))
        : toDegrees(Math.acos(cosHourAngle));
    hourAngle /= 15;

    const localMeanTime = hourAngle + rightAscension - (0.06571 * approxTime) - 6.622;
    let universalTime = localMeanTime - lngHour;
    universalTime = ((universalTime % 24) + 24) % 24;

    const hours = Math.floor(universalTime);
    const minutesFloat = (universalTime - hours) * 60;
    const minutes = Math.floor(minutesFloat);
    const seconds = Math.round((minutesFloat - minutes) * 60);

    return new Date(Date.UTC(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        hours,
        minutes,
        seconds
    ));
}

function resolveDaylightPhase(now: Date, latitude: number, longitude: number): DaylightPhase {
    const sunriseUtc = calculateSunEventUtc(now, latitude, longitude, true);
    const sunsetUtc = calculateSunEventUtc(now, latitude, longitude, false);
    if (!sunriseUtc || !sunsetUtc) {
        const hour = now.getHours();
        return hour >= 6 && hour < 18 ? "day" : "night";
    }

    return now >= sunriseUtc && now < sunsetUtc ? "day" : "night";
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
    const geoWatchIdRef = useRef<number | null>(null);
    const [geoPosition, setGeoPosition] = useState<{ latitude: number; longitude: number } | null>(null);
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
            const now = new Date();
            if (geoPosition) {
                setDaylightPhase(resolveDaylightPhase(now, geoPosition.latitude, geoPosition.longitude));
                return;
            }
            const hour = now.getHours();
            setDaylightPhase(hour >= 6 && hour < 18 ? "day" : "night");
        };

        updatePhase();
        const intervalId = window.setInterval(updatePhase, 60_000);
        return () => window.clearInterval(intervalId);
    }, [geoPosition]);

    useEffect(() => {
        if (!("geolocation" in navigator)) return;

        geoWatchIdRef.current = navigator.geolocation.watchPosition(
            (position) => {
                setGeoPosition({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                });
            },
            () => {
                setGeoPosition(null);
            },
            {
                enableHighAccuracy: false,
                maximumAge: 30 * 60 * 1000,
                timeout: 20_000
            }
        );

        return () => {
            if (geoWatchIdRef.current !== null) {
                navigator.geolocation.clearWatch(geoWatchIdRef.current);
            }
        };
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
