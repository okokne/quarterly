import { useEffect, useMemo, useState } from "react";
import { Filter } from "./ui/icons";
import { AppLanguage, Cycle, DateFormat, JournalContext, ReviewEntry } from "../types";
import { t as tr } from "../i18n";
import {
    createJournalCustomReviewEntry,
    createJournalDailyReviewEntry,
    createJournalWeeklyReviewEntry,
    getReviewEntrySearchText,
    getWeekIndexForDate,
    getWritableReviewEntries,
    matchesSignalFilter
} from "../utils";
import { JournalComposer } from "./journal/JournalComposer";
import { JournalFeedList } from "./journal/JournalFeedList";
import { JournalFeedToolbar } from "./journal/JournalFeedToolbar";
import { FilterOption } from "./journal/types";
import { useJournalState } from "../hooks/useJournalState";
import { Icon } from "./ui/Icon";

type Tab = "today" | "week" | "stats" | "journal";

interface JournalViewProps {
    cycle: Cycle;
    language: AppLanguage;
    dateFormat: DateFormat;
    readOnly: boolean;
    setSelectedWeek: (week: number) => void;
    setSelectedDate: (date: string) => void;
    setActiveTab: (tab: Tab) => void;
    updateCycle: (updater: (prev: Cycle) => Cycle) => void;
    onOpenLabelSettings: (contextId?: string) => void;
}

export function JournalView({
    cycle,
    language,
    dateFormat,
    readOnly,
    setSelectedWeek,
    setSelectedDate,
    setActiveTab,
    updateCycle,
    onOpenLabelSettings
}: JournalViewProps) {
    const {
        today,
        showComposer,
        setShowComposer,
        showFilters,
        setShowFilters,
        composerType,
        setComposerType,
        customDate,
        setCustomDate,
        customTitle,
        setCustomTitle,
        customContent,
        setCustomContent,
        customContextId,
        setCustomContextId,
        customSignals,
        toggleCustomSignal,
        dailyDate,
        setDailyDate,
        dailyGood,
        setDailyGood,
        dailyBad,
        setDailyBad,
        weeklyWeek,
        setWeeklyWeek,
        weeklyGood,
        setWeeklyGood,
        weeklyBad,
        setWeeklyBad,
        weeklyChange,
        setWeeklyChange,
        searchQuery,
        setSearchQuery,
        typeFilter,
        setTypeFilter,
        signalFilter,
        setSignalFilter,
        rangeFilter,
        setRangeFilter,
        contextFilter,
        setContextFilter,
        openMonths,
        setOpenMonths,
        toggleSignalSelection,
        toggleContextSelection,
        resetComposerFields,
        composerSubmitDisabled,
        typeOptions,
        signalOptions,
        rangeOptions
    } = useJournalState({ cycle });

    const currentMonthKey = today.slice(0, 7);
    const currentWeek = useMemo(() => {
        return cycle.weeks.find((week) => today >= week.startDate && today <= week.endDate) ?? cycle.weeks[0];
    }, [cycle.weeks, today]);
    const quarterStart = cycle.startDate;
    const quarterEnd = cycle.weeks[cycle.weeks.length - 1]?.endDate ?? cycle.startDate;

    const allEntries = useMemo(() => getWritableReviewEntries(cycle), [
        cycle,
        cycle.reviewEntries,
        cycle.dailyReviews,
        cycle.weeklyReviews,
        cycle.journalEntries
    ]);

    const normalizedSearch = searchQuery.trim().toLowerCase();
    const contextById = useMemo(() => {
        const map = new Map<string, JournalContext>();
        (cycle.journalContexts ?? []).forEach((context) => {
            map.set(context.id, context);
        });
        return map;
    }, [cycle.journalContexts]);
    const contextLabelById = useMemo(() => {
        const map = new Map<string, string>();
        contextById.forEach((context, id) => map.set(id, context.label));
        return map;
    }, [contextById]);
    const contextOptions = useMemo<Array<FilterOption<string>>>(() => {
        return (cycle.journalContexts ?? []).map((context) => ({
            id: context.id,
            labelKey: context.label
        }));
    }, [cycle.journalContexts]);

    const [editingNote, setEditingNote] = useState<ReviewEntry | null>(null);
    const [noteTitle, setNoteTitle] = useState("");
    const [noteContent, setNoteContent] = useState("");
    const [noteContextId, setNoteContextId] = useState("");
    const [noteDate, setNoteDate] = useState(today);

    const filteredEntries = useMemo(() => {
        const activeContextFilter = contextFilter.filter((id) => contextLabelById.has(id));
        return allEntries.filter((entry) => {
            if (typeFilter === "note") {
                if (entry.type !== "custom" && entry.type !== "quick") return false;
            } else if (typeFilter !== "all" && entry.type !== typeFilter) {
                return false;
            }
            if (!matchesSignalFilter(entry, signalFilter)) return false;
            if (activeContextFilter.length > 0) {
                if (!entry.contextId || !activeContextFilter.includes(entry.contextId)) return false;
            }

            if (rangeFilter === "current_week") {
                if (!currentWeek || entry.date < currentWeek.startDate || entry.date > currentWeek.endDate) return false;
            } else if (rangeFilter === "current_month") {
                if (!entry.date.startsWith(currentMonthKey)) return false;
            } else if (rangeFilter === "quarter") {
                if (entry.date < quarterStart || entry.date > quarterEnd) return false;
            }

            if (!normalizedSearch) return true;
            const searchable = getReviewEntrySearchText(entry);
            return searchable.includes(normalizedSearch);
        });
    }, [
        allEntries,
        contextFilter,
        contextLabelById,
        currentMonthKey,
        currentWeek,
        normalizedSearch,
        quarterEnd,
        quarterStart,
        rangeFilter,
        signalFilter,
        typeFilter
    ]);

    useEffect(() => {
        setContextFilter((prev) => prev.filter((contextId) => contextLabelById.has(contextId)));
    }, [contextLabelById, setContextFilter]);

    const groupedEntries = useMemo(() => {
        const groups = new Map<string, ReviewEntry[]>();
        filteredEntries.forEach((entry) => {
            const key = entry.date.slice(0, 7);
            const bucket = groups.get(key) ?? [];
            bucket.push(entry);
            groups.set(key, bucket);
        });

        return Array.from(groups.entries()).sort(([a], [b]) => b.localeCompare(a));
    }, [filteredEntries]);

    useEffect(() => {
        const monthKeys = groupedEntries.map(([key]) => key);
        setOpenMonths((prev) => {
            const next: Record<string, boolean> = {};
            monthKeys.forEach((key) => {
                next[key] = prev[key] ?? key === currentMonthKey;
            });
            return next;
        });
    }, [groupedEntries, currentMonthKey, setOpenMonths]);

    const highlightAndScroll = (selector: string) => {
        window.setTimeout(() => {
            const target = document.querySelector<HTMLElement>(selector);
            if (!target) return;
            target.scrollIntoView({ behavior: "smooth", block: "start" });
            target.classList.add("journal-nav-focus");
            window.setTimeout(() => target.classList.remove("journal-nav-focus"), 900);
        }, 120);
    };

    const handleOpenEntry = (entry: ReviewEntry) => {
        if (entry.type === "custom" || entry.type === "quick") {
            setEditingNote(entry);
            setNoteTitle(entry.title ?? "");
            setNoteContent(entry.content ?? "");
            setNoteContextId(entry.contextId ?? "");
            setNoteDate(entry.date);
            return;
        }

        if (entry.type === "daily") {
            setSelectedDate(entry.date);
            setActiveTab("today");
            highlightAndScroll("#today-daily-review");
            return;
        }

        if (entry.type === "weekly") {
            const weekIndex = entry.weekIndex ?? getWeekIndexForDate(cycle, entry.date);
            setSelectedWeek(weekIndex);
            setActiveTab("week");
            highlightAndScroll("#week-review");
        }
    };

    const handleDeleteEntry = (entryId: string) => {
        if (readOnly) return;
        if (!window.confirm(tr(language, "journal.deleteEntryConfirm"))) return;

        updateCycle((prev) => {
            const currentEntries = getWritableReviewEntries(prev);
            const target = currentEntries.find((entry) => entry.id === entryId);
            if (!target) return prev;

            const nextEntries = currentEntries.filter((entry) => entry.id !== entryId);
            const nextCycle: Cycle = {
                ...prev,
                reviewEntries: nextEntries
            };

            if (target.type === "custom") {
                nextCycle.journalEntries = (prev.journalEntries ?? []).filter((entry) => entry.id !== target.id);
            }

            if (target.type === "daily" && target.source === "today_tab") {
                const nextDailyReviews = { ...prev.dailyReviews };
                delete nextDailyReviews[target.date];
                nextCycle.dailyReviews = nextDailyReviews;
            }

            if (target.type === "weekly" && target.source === "week_tab" && target.weekIndex) {
                const nextWeeklyReviews = { ...prev.weeklyReviews };
                delete nextWeeklyReviews[target.weekIndex];
                nextCycle.weeklyReviews = nextWeeklyReviews;
            }

            return nextCycle;
        });
    };

    const handleCreateEntry = () => {
        if (readOnly) return;

        updateCycle((prev) => {
            const currentEntries = getWritableReviewEntries(prev);

            if (composerType === "custom") {
                const created = createJournalCustomReviewEntry({
                    title: customTitle,
                    content: customContent,
                    date: customDate,
                    contextId: customContextId || undefined,
                    signals: customSignals
                });
                if (!created) return prev;

                return {
                    ...prev,
                    reviewEntries: [created, ...currentEntries],
                    journalEntries: [
                        {
                            id: created.id,
                            title: created.title ?? "",
                            content: created.content ?? "",
                            date: created.date,
                            createdAt: created.createdAt
                        },
                        ...(prev.journalEntries ?? [])
                    ]
                };
            }

            if (composerType === "daily") {
                const created = createJournalDailyReviewEntry({
                    date: dailyDate,
                    good: dailyGood,
                    bad: dailyBad
                });
                if (!created) return prev;

                return {
                    ...prev,
                    reviewEntries: [created, ...currentEntries],
                    dailyReviews: {
                        ...prev.dailyReviews,
                        [dailyDate]: {
                            good: dailyGood.trim(),
                            bad: dailyBad.trim()
                        }
                    }
                };
            }

            const weekIndex = Number.parseInt(weeklyWeek, 10);
            const selectedWeek = prev.weeks.find((week) => week.index === weekIndex);
            if (!selectedWeek) return prev;

            const created = createJournalWeeklyReviewEntry({
                weekIndex,
                date: selectedWeek.startDate,
                good: weeklyGood,
                bad: weeklyBad,
                change: weeklyChange
            });
            if (!created) return prev;

            return {
                ...prev,
                reviewEntries: [created, ...currentEntries],
                weeklyReviews: {
                    ...prev.weeklyReviews,
                    [weekIndex]: {
                        good: weeklyGood.trim(),
                        bad: weeklyBad.trim(),
                        change: weeklyChange.trim()
                    }
                }
            };
        });

        resetComposerFields();
        setShowComposer(false);
    };

    const noteSaveDisabled = !noteTitle.trim() && !noteContent.trim();
    const handleOpenLabelSettings = () => {
        const fallbackContextId = customContextId || cycle.defaultJournalContextId || cycle.journalContexts?.[0]?.id;
        onOpenLabelSettings(fallbackContextId);
    };

    const handleSaveNote = () => {
        if (readOnly || !editingNote || noteSaveDisabled) return;

        const nextTitle = noteTitle.trim() || undefined;
        const nextContent = noteContent.trim() || undefined;
        const nextContextId = noteContextId.trim() || undefined;
        const nextDate = noteDate.trim() || editingNote.date;
        const now = new Date().toISOString();

        updateCycle((prev) => {
            const nextReviewEntries = getWritableReviewEntries(prev).map((entry) => {
                if (entry.id !== editingNote.id) return entry;
                return {
                    ...entry,
                    date: nextDate,
                    weekIndex: entry.type === "quick" ? getWeekIndexForDate(prev, nextDate) : undefined,
                    title: nextTitle,
                    content: nextContent,
                    contextId: nextContextId,
                    updatedAt: now
                };
            });

            const nextCycle: Cycle = {
                ...prev,
                reviewEntries: nextReviewEntries
            };

            if (editingNote.type === "custom") {
                nextCycle.journalEntries = (prev.journalEntries ?? []).map((entry) => (
                    entry.id === editingNote.id
                        ? {
                            ...entry,
                            title: nextTitle ?? "",
                            content: nextContent ?? "",
                            date: nextDate
                        }
                        : entry
                ));
            }

            return nextCycle;
        });

        setEditingNote(null);
    };

    return (
        <section className="card journal-view">
            <div className="journal-header">
                <div>
                    <h2>{tr(language, "journal.title")}</h2>
                    <p className="muted journal-subtitle">{tr(language, "journal.subtitle")}</p>
                </div>
                <div className="journal-header-actions">
                    <button
                        className="primary journal-add-btn"
                        disabled={readOnly}
                        onClick={() => setShowComposer((prev) => !prev)}
                        title={tr(language, "journal.addEntry")}
                    >
                        + {tr(language, "journal.addEntry")}
                    </button>
                    <button
                        type="button"
                        className={`journal-filter-toggle-btn ${showFilters ? "active" : ""}`}
                        onClick={() => setShowFilters((prev) => !prev)}
                        title={tr(language, "journal.toggleFilters")}
                    >
                        <Icon icon={Filter} size={15} />
                        {tr(language, "journal.toggleFilters")}
                    </button>
                </div>
            </div>

            {readOnly && <p className="readonly-note">{tr(language, "app.archiveReadOnlyMode")}</p>}

            <JournalComposer
                cycle={cycle}
                language={language}
                readOnly={readOnly}
                showComposer={showComposer}
                setShowComposer={setShowComposer}
                composerType={composerType}
                setComposerType={setComposerType}
                signalOptions={signalOptions}
                customDate={customDate}
                setCustomDate={setCustomDate}
                customTitle={customTitle}
                setCustomTitle={setCustomTitle}
                customContent={customContent}
                setCustomContent={setCustomContent}
                customContextId={customContextId}
                setCustomContextId={setCustomContextId}
                customSignals={customSignals}
                toggleCustomSignal={toggleCustomSignal}
                onOpenLabelSettings={handleOpenLabelSettings}
                dailyDate={dailyDate}
                setDailyDate={setDailyDate}
                dailyGood={dailyGood}
                setDailyGood={setDailyGood}
                dailyBad={dailyBad}
                setDailyBad={setDailyBad}
                weeklyWeek={weeklyWeek}
                setWeeklyWeek={setWeeklyWeek}
                weeklyGood={weeklyGood}
                setWeeklyGood={setWeeklyGood}
                weeklyBad={weeklyBad}
                setWeeklyBad={setWeeklyBad}
                weeklyChange={weeklyChange}
                setWeeklyChange={setWeeklyChange}
                composerSubmitDisabled={composerSubmitDisabled}
                handleCreateEntry={handleCreateEntry}
            />

            {showFilters && (
                <JournalFeedToolbar
                    language={language}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    typeFilter={typeFilter}
                    setTypeFilter={setTypeFilter}
                    typeOptions={typeOptions}
                    signalFilter={signalFilter}
                    setSignalFilter={setSignalFilter}
                    signalOptions={signalOptions}
                    toggleSignalSelection={toggleSignalSelection}
                    rangeFilter={rangeFilter}
                    setRangeFilter={setRangeFilter}
                    rangeOptions={rangeOptions}
                    contextFilter={contextFilter}
                    setContextFilter={setContextFilter}
                    contextOptions={contextOptions}
                    toggleContextSelection={toggleContextSelection}
                    onClose={() => setShowFilters(false)}
                />
            )}

            <JournalFeedList
                cycle={cycle}
                language={language}
                dateFormat={dateFormat}
                readOnly={readOnly}
                allEntriesCount={allEntries.length}
                filteredEntriesCount={filteredEntries.length}
                groupedEntries={groupedEntries}
                currentMonthKey={currentMonthKey}
                openMonths={openMonths}
                setOpenMonths={setOpenMonths}
                contextById={contextById}
                handleOpenEntry={handleOpenEntry}
                handleDeleteEntry={handleDeleteEntry}
            />

            {editingNote && (
                <div className="modal-backdrop quick-note-backdrop" onClick={() => setEditingNote(null)}>
                    <div className="modal quick-note-modal" onClick={(event) => event.stopPropagation()}>
                        <h3>{tr(language, "journal.editNoteTitle")}</h3>
                        <label>
                            {tr(language, "common.title")} ({tr(language, "common.optional")})
                            <input
                                value={noteTitle}
                                onChange={(event) => setNoteTitle(event.target.value)}
                                placeholder={tr(language, "quickNote.titlePlaceholder")}
                            />
                        </label>
                        <label>
                            {tr(language, "quickNote.text")}
                            <textarea
                                value={noteContent}
                                onChange={(event) => setNoteContent(event.target.value)}
                                placeholder={tr(language, "quickNote.textPlaceholder")}
                                autoFocus
                            />
                        </label>
                        <div className="grid grid-two">
                            <label>
                                {tr(language, "journal.filterContext")}
                                <select value={noteContextId} onChange={(event) => setNoteContextId(event.target.value)}>
                                    <option value="">{tr(language, "journal.contextNone")}</option>
                                    {(cycle.journalContexts ?? []).map((context) => (
                                        <option key={context.id} value={context.id}>{context.label}</option>
                                    ))}
                                </select>
                            </label>
                            <label>
                                {tr(language, "journal.entryDate")}
                                <input type="date" value={noteDate} onChange={(event) => setNoteDate(event.target.value)} />
                            </label>
                        </div>
                        <div className="modal-actions">
                            <button className="primary" onClick={handleSaveNote} disabled={readOnly || noteSaveDisabled}>
                                {tr(language, "common.save")}
                            </button>
                            <button onClick={() => setEditingNote(null)}>{tr(language, "common.cancel")}</button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
