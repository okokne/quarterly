import {
    Dispatch,
    SetStateAction,
    useCallback,
    useEffect,
    useRef,
    useState,
    type PointerEvent as ReactPointerEvent
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
    formatRange,
    formatTime,
    getDatesInWeek,
    getWritableReviewEntries,
    upsertCurrentDailyReviewEntry,
    weekdayLabel
} from "../utils";
import { ProgressBar } from "./ProgressBar";
import { ToggleSwitch } from "./ToggleSwitch";
import { getBlockCompletionState } from "../regressionLogic";

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
    currentWeek: Cycle["weeks"][number];
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
    totalWeeklyDone: (weekIndex: number, targetId: Id) => number;
    getActiveHabitsForDate: (date: string) => Array<{ id: Id; title: string; emoji: string }>;
    habitLog: Record<string, string[]>;
    onToggleHabit: (date: string, habitId: Id) => void;
    onDeleteHabit: (habitId: Id) => void;
    onOpenSettings: () => void;
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
    currentWeek,
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
    totalWeeklyDone,
    getActiveHabitsForDate,
    habitLog,
    onToggleHabit,
    onDeleteHabit,
    onOpenSettings,
    dailyReview,
    updateCycle
}: TodayTabProps) {
    const [touchDraggingBlockId, setTouchDraggingBlockId] = useState<Id | null>(null);
    const [touchDragOverBlockId, setTouchDragOverBlockId] = useState<Id | null>(null);
    const touchDragRef = useRef<{ active: boolean; pointerId: number | null; currentIndex: number }>({
        active: false,
        pointerId: null,
        currentIndex: -1
    });

    const endTouchReorder = useCallback((pointerId?: number) => {
        const state = touchDragRef.current;
        if (!state.active) return;
        if (pointerId !== undefined && state.pointerId !== null && pointerId !== state.pointerId) return;

        touchDragRef.current = {
            active: false,
            pointerId: null,
            currentIndex: -1
        };
        setTouchDraggingBlockId(null);
        setTouchDragOverBlockId(null);
    }, []);

    const handleTouchReorderMove = useCallback((event: PointerEvent) => {
        const state = touchDragRef.current;
        if (!state.active) return;
        if (state.pointerId !== null && event.pointerId !== state.pointerId) return;

        event.preventDefault();
        const hit = document.elementFromPoint(event.clientX, event.clientY);
        if (!(hit instanceof Element)) return;
        const row = hit.closest("[data-block-index]") as HTMLElement | null;
        if (!row) return;

        const targetIndex = Number(row.dataset.blockIndex);
        if (!Number.isInteger(targetIndex) || targetIndex < 0 || targetIndex >= dayBlocks.length) return;

        const hoveredBlock = dayBlocks[targetIndex];
        setTouchDragOverBlockId(hoveredBlock?.id ?? null);

        if (targetIndex === state.currentIndex) return;
        onReorderBlocks(selectedDate, state.currentIndex, targetIndex);
        state.currentIndex = targetIndex;
    }, [dayBlocks, onReorderBlocks, selectedDate]);

    useEffect(() => {
        if (!touchDraggingBlockId) return;

        const handlePointerUp = (event: PointerEvent) => {
            endTouchReorder(event.pointerId);
        };
        const handlePointerCancel = (event: PointerEvent) => {
            endTouchReorder(event.pointerId);
        };

        window.addEventListener("pointermove", handleTouchReorderMove, { passive: false });
        window.addEventListener("pointerup", handlePointerUp);
        window.addEventListener("pointercancel", handlePointerCancel);

        return () => {
            window.removeEventListener("pointermove", handleTouchReorderMove);
            window.removeEventListener("pointerup", handlePointerUp);
            window.removeEventListener("pointercancel", handlePointerCancel);
        };
    }, [touchDraggingBlockId, handleTouchReorderMove, endTouchReorder]);

    const startTouchReorder = useCallback((event: ReactPointerEvent<HTMLDivElement>, blockId: Id, index: number) => {
        if (isArchiveView) return;
        if (event.pointerType === "mouse") return;

        event.preventDefault();
        event.stopPropagation();
        touchDragRef.current = {
            active: true,
            pointerId: event.pointerId,
            currentIndex: index
        };
        setTouchDraggingBlockId(blockId);
        setTouchDragOverBlockId(blockId);

        if (event.currentTarget.setPointerCapture) {
            event.currentTarget.setPointerCapture(event.pointerId);
        }
    }, [isArchiveView]);

    return (
        <section className="card">
            <div className="section-title">
                <h2>{tr(language, "today.title")}</h2>
                <span className="muted">{weekdayLabel(selectedDate, language)} · {formatDate(selectedDate, dateFormat, language)}</span>
            </div>
            {isArchiveView && <p className="readonly-note">{tr(language, "app.archiveReadOnlyMode")}</p>}

            <div className="grid">
                <label>
                    {tr(language, "today.weekSelect")}
                    <select
                        value={selectedWeek}
                        onChange={(e) => {
                            const nextWeek = Number(e.target.value);
                            setSelectedWeek(nextWeek);
                            const week = cycle.weeks.find((item) => item.index === nextWeek);
                            if (week) setSelectedDate(week.startDate);
                        }}
                    >
                        {cycle.weeks.map((week) => (
                            <option key={week.index} value={week.index}>
                                {tr(language, "app.headerWeekShort", { week: week.index })} · {formatRange(week.startDate, week.endDate, dateFormat, language)}
                            </option>
                        ))}
                    </select>
                </label>
            </div>

            <div className="week-grid">
                {getDatesInWeek(currentWeek).map((date) => (
                    <button
                        key={date}
                        className={`chip ${selectedDate === date ? "active" : ""}`}
                        onClick={() => setSelectedDate(date)}
                    >
                        {weekdayLabel(date, language)} · {formatDate(date, dateFormat, language)}
                    </button>
                ))}
            </div>

            <fieldset className="readonly-fieldset" disabled={isArchiveView}>
                <div className="subcard">
                    <h3>{tr(language, "today.dayPlan")}</h3>
                    <div className="grid">
                        <label>
                            {tr(language, "common.start")}
                            <input type="time" value={blockDraft.startTime} onChange={(e) => setBlockDraft({ ...blockDraft, startTime: e.target.value })} />
                        </label>
                        <label>
                            {tr(language, "common.end")}
                            <input type="time" value={blockDraft.endTime} onChange={(e) => setBlockDraft({ ...blockDraft, endTime: e.target.value })} />
                        </label>
                        <label>
                            {tr(language, "common.title")}
                            <input value={blockDraft.title} onChange={(e) => setBlockDraft({ ...blockDraft, title: e.target.value })} placeholder={tr(language, "today.blockPlaceholder")} />
                        </label>
                        <label>
                            {tr(language, "today.weeklyTargetOptional")}
                            <select
                                value={blockDraft.linkedTargetId}
                                onChange={(e) => setBlockDraft({ ...blockDraft, linkedTargetId: e.target.value })}
                            >
                                <option value="">{tr(language, "common.none")}</option>
                                {selectedWeekTargets.map((target) => (
                                    <option key={target.id} value={target.id}>{target.title}</option>
                                ))}
                            </select>
                        </label>
                        <label>
                            {tr(language, "today.plannedAmountOptional")}
                            <input
                                type="number"
                                min={1}
                                value={blockDraft.amount}
                                onChange={(e) => setBlockDraft({ ...blockDraft, amount: Number(e.target.value) })}
                            />
                        </label>
                    </div>
                    <div className="button-row">
                        <button className="primary" onClick={() => onAddBlock(selectedDate)}>{tr(language, "today.blockAdd")}</button>
                        {dayBlocks.length > 0 && (
                            <button onClick={onOpenTemplateModal}>{tr(language, "today.saveAsTemplate")}</button>
                        )}
                    </div>

                    {templates.length > 0 && (
                        <div className="subcard template-section">
                            <h4>{tr(language, "today.templates")}</h4>
                            <div className="template-list">
                                {templates.map((template) => (
                                    <div key={template.id} className="template-item">
                                        <div>
                                            <strong>{template.name}</strong>
                                            <span className="muted"> · {tr(language, "today.blocksCount", { count: template.blocks.length })}</span>
                                        </div>
                                        <div className="button-row compact">
                                            <button onClick={() => onLoadTemplate(template)}>{tr(language, "common.load")}</button>
                                            <button onClick={() => onDeleteTemplate(template.id)}>🗑</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="list sortable">
                        {dayBlocks.length === 0 && <p className="empty">{tr(language, "today.noBlocks")}</p>}
                        {dayBlocks.map((block, index) => (
                            (() => {
                                const {
                                    plannedAmount,
                                    usesCounter,
                                    actualValue,
                                    sliderValue,
                                    isDone
                                } = getBlockCompletionState({
                                    amount: block.amount,
                                    actual: block.actual,
                                    done: block.done
                                });
                                const sliderPercent = plannedAmount > 0 ? (sliderValue / plannedAmount) * 100 : 0;
                                const isTouchDragActive = touchDraggingBlockId === block.id;
                                const isTouchDragOver = touchDragOverBlockId === block.id && !isTouchDragActive;

                                return (
                                    <div
                                        key={block.id}
                                        className={`list-item ${isDone ? "done" : ""} ${draggingBlockId === block.id ? "dragging" : ""} ${isTouchDragActive ? "touch-drag-active" : ""} ${isTouchDragOver ? "touch-drag-over" : ""}`}
                                        data-block-id={String(block.id)}
                                        data-block-index={index}
                                        onDragOver={(e) => {
                                            if (isArchiveView) return;
                                            e.preventDefault();
                                            e.dataTransfer.dropEffect = "move";
                                        }}
                                        onDrop={() => {
                                            if (isArchiveView) return;
                                            if (draggingBlockId && draggingBlockId !== block.id) {
                                                const fromIdx = dayBlocks.findIndex((item) => item.id === draggingBlockId);
                                                if (fromIdx >= 0) {
                                                    onReorderBlocks(selectedDate, fromIdx, index);
                                                }
                                            }
                                            setDraggingBlockId(null);
                                        }}
                                    >
                                        <div
                                            className="drag-handle"
                                            draggable={!isArchiveView}
                                            onPointerDown={(e) => startTouchReorder(e, block.id, index)}
                                            onDragStart={(e) => {
                                                if (isArchiveView) {
                                                    e.preventDefault();
                                                    return;
                                                }

                                                setDraggingBlockId(block.id);
                                                e.dataTransfer.effectAllowed = "move";
                                                const row = e.currentTarget.parentElement;
                                                if (row) {
                                                    e.dataTransfer.setDragImage(row, 0, 0);
                                                }
                                            }}
                                            onDragEnd={() => setDraggingBlockId(null)}
                                        >
                                            ⋮⋮
                                        </div>
                                        <div className="block-content">
                                            <div className="block-title-row">
                                                <strong className="block-title">{formatTime(block.startTime, timeFormat)}–{formatTime(block.endTime, timeFormat)} · {block.title}</strong>
                                                <button
                                                    data-no-drag="true"
                                                    className="block-delete-x"
                                                    title={tr(language, "common.delete")}
                                                    aria-label={tr(language, "common.delete")}
                                                    onPointerDown={(e) => e.stopPropagation()}
                                                    onMouseDown={(e) => e.stopPropagation()}
                                                    onClick={() => onDeleteBlock(selectedDate, block.id)}
                                                >
                                                    ✕
                                                </button>
                                            </div>

                                            <div
                                                className="toggle-row"
                                                data-no-drag="true"
                                                onPointerDown={(e) => e.stopPropagation()}
                                                onMouseDown={(e) => e.stopPropagation()}
                                                onTouchStart={(e) => e.stopPropagation()}
                                            >
                                                <span className="toggle-label">{tr(language, "today.markLabel")}</span>
                                                <span className={`toggle-status ${isDone ? "done" : "pending"}`}>
                                                    {isDone ? tr(language, "today.completedStatus") : tr(language, "today.pendingStatus")}
                                                </span>
                                                <ToggleSwitch
                                                    checked={isDone}
                                                    ariaLabel={tr(language, "today.markLabel")}
                                                    onChange={(checked) => {
                                                        const nextActual = usesCounter
                                                            ? checked
                                                                ? plannedAmount
                                                                : 0
                                                            : checked
                                                                ? 1
                                                                : 0;
                                                        onUpdateBlock(selectedDate, block.id, {
                                                            done: checked,
                                                            actual: nextActual
                                                        });
                                                    }}
                                                />
                                            </div>

                                            {block.linkedTargetId && (
                                                <div className="block-meta-row">
                                                    <div className="muted block-link">
                                                        {tr(language, "today.linked", { target: selectedWeekTargets.find((target) => target.id === block.linkedTargetId)?.title ?? tr(language, "week.weeklyTarget") })}
                                                    </div>
                                                </div>
                                            )}

                                            {usesCounter && (
                                                <div className="block-progress-row">
                                                    <div
                                                        className="block-counter block-counter-shell"
                                                        data-no-drag="true"
                                                        onPointerDown={(e) => e.stopPropagation()}
                                                        onMouseDown={(e) => e.stopPropagation()}
                                                        onTouchStart={(e) => e.stopPropagation()}
                                                    >
                                                        <input
                                                            className="block-counter-range"
                                                            type="range"
                                                            min={0}
                                                            max={plannedAmount}
                                                            value={sliderValue}
                                                            style={{
                                                                background: `linear-gradient(to right, var(--accent) ${sliderPercent}%, var(--border) ${sliderPercent}%)`
                                                            }}
                                                            draggable={false}
                                                            onMouseDown={(e) => e.stopPropagation()}
                                                            onTouchStart={(e) => e.stopPropagation()}
                                                            onClick={(e) => e.stopPropagation()}
                                                            onKeyDown={(e) => e.stopPropagation()}
                                                            onChange={(e) => {
                                                                const nextActual = Math.min(Math.max(Number(e.target.value), 0), plannedAmount);
                                                                onUpdateBlock(selectedDate, block.id, {
                                                                    actual: nextActual,
                                                                    done: nextActual >= plannedAmount
                                                                });
                                                            }}
                                                        />
                                                        <span className="block-counter-value">{actualValue}/{plannedAmount}</span>
                                                        <input
                                                            className="block-counter-input"
                                                            type="number"
                                                            min={0}
                                                            max={plannedAmount}
                                                            step={1}
                                                            inputMode="numeric"
                                                            value={actualValue}
                                                            draggable={false}
                                                            onMouseDown={(e) => e.stopPropagation()}
                                                            onTouchStart={(e) => e.stopPropagation()}
                                                            onClick={(e) => e.stopPropagation()}
                                                            onKeyDown={(e) => e.stopPropagation()}
                                                            onFocus={(e) => e.currentTarget.select()}
                                                            onChange={(e) =>
                                                                (() => {
                                                                    const raw = e.target.value.trim();
                                                                    if (raw === "") {
                                                                        onUpdateBlock(selectedDate, block.id, { actual: 0, done: false });
                                                                        return;
                                                                    }

                                                                    const parsed = Number.parseInt(raw, 10);
                                                                    if (Number.isNaN(parsed)) return;
                                                                    const nextActual = Math.min(Math.max(0, parsed), plannedAmount);

                                                                    onUpdateBlock(selectedDate, block.id, {
                                                                        actual: nextActual,
                                                                        done: nextActual >= plannedAmount
                                                                    });
                                                                })()
                                                            }
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })()
                        ))}
                    </div>
                </div>

                <div className="subcard">
                    <h3>{tr(language, "today.openThisWeek")}</h3>
                    <div className="list">
                        {selectedWeekTargets.length === 0 && <p className="empty">{tr(language, "today.noWeekTargets")}</p>}
                        {getWeeklyRemaining(selectedWeek).map((target) => {
                            const autoDone = totalWeeklyDone(selectedWeek, target.id);
                            const done = Math.max(target.done, autoDone);
                            const remaining = Math.max(0, target.target - done);
                            return (
                                <div key={target.id} className="list-item column">
                                    <div className="list-row">
                                        <div>
                                            <strong>{target.title}</strong>
                                            <div className="muted">{tr(language, "today.remaining", { done, target: target.target, unit: target.unit ?? "", remaining })}</div>
                                        </div>
                                    </div>
                                    <ProgressBar value={done} max={target.target} showLabel={false} />
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="subcard">
                    <div className="section-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <h3>{tr(language, "today.habits")}</h3>
                        <button
                            onClick={onOpenSettings}
                            className="text-btn"
                            style={{ fontSize: "0.8rem" }}
                        >
                            {tr(language, "common.manage")} ⚙️
                        </button>
                    </div>

                    <div className="habit-toggle-row">
                        {getActiveHabitsForDate(selectedDate).map((habit) => {
                            const log = habitLog[selectedDate] ?? [];
                            const done = log.includes(habit.id);
                            return (
                                <button
                                    key={habit.id}
                                    className={`habit-chip ${done ? "done" : ""}`}
                                    onClick={() => onToggleHabit(selectedDate, habit.id)}
                                    onContextMenu={(e) => {
                                        e.preventDefault();
                                        if (isArchiveView) return;
                                        if (window.confirm(tr(language, "today.deleteHabitConfirm", { title: habit.title }))) {
                                            onDeleteHabit(habit.id);
                                        }
                                    }}
                                    title={tr(language, "today.deleteOnRightClick", { title: habit.title })}
                                >
                                    <span className="habit-chip-emoji">{habit.emoji}</span>
                                    <span className="habit-chip-label">{habit.title}</span>
                                    <span className="habit-chip-check">{done ? "✅" : "⬜"}</span>
                                </button>
                            );
                        })}

                        <button
                            className="habit-chip add-habit-btn"
                            onClick={onOpenSettings}
                            title={tr(language, "today.newHabit")}
                        >
                            {tr(language, "today.new")}
                        </button>
                    </div>
                </div>

                <div className="subcard">
                    <h3>{tr(language, "review.daily", { date: formatDate(selectedDate, dateFormat, language) })}</h3>
                    <div className="grid">
                        <label>
                            {tr(language, "review.good")}
                            <textarea
                                value={dailyReview.good}
                                onChange={(e) =>
                                    updateCycle((prev) => ({
                                        ...prev,
                                        dailyReviews: {
                                            ...prev.dailyReviews,
                                            [selectedDate]: {
                                                ...(prev.dailyReviews[selectedDate] ?? { good: "", bad: "" }),
                                                good: e.target.value
                                            }
                                        },
                                        reviewEntries: upsertCurrentDailyReviewEntry({
                                            entries: getWritableReviewEntries(prev),
                                            date: selectedDate,
                                            review: {
                                                ...(prev.dailyReviews[selectedDate] ?? { good: "", bad: "" }),
                                                good: e.target.value
                                            },
                                            source: "today_tab"
                                        })
                                    }))
                                }
                            />
                        </label>
                        <label>
                            {tr(language, "review.bad")}
                            <textarea
                                value={dailyReview.bad}
                                onChange={(e) =>
                                    updateCycle((prev) => ({
                                        ...prev,
                                        dailyReviews: {
                                            ...prev.dailyReviews,
                                            [selectedDate]: {
                                                ...(prev.dailyReviews[selectedDate] ?? { good: "", bad: "" }),
                                                bad: e.target.value
                                            }
                                        },
                                        reviewEntries: upsertCurrentDailyReviewEntry({
                                            entries: getWritableReviewEntries(prev),
                                            date: selectedDate,
                                            review: {
                                                ...(prev.dailyReviews[selectedDate] ?? { good: "", bad: "" }),
                                                bad: e.target.value
                                            },
                                            source: "today_tab"
                                        })
                                    }))
                                }
                            />
                        </label>
                    </div>
                </div>
            </fieldset>
        </section>
    );
}
