import { useEffect, useMemo } from "react";
import { AppLanguage, Cycle, DateFormat, ReviewEntry } from "../types";
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
}

export function JournalView({ cycle, language, dateFormat, readOnly, setSelectedWeek, setSelectedDate, setActiveTab, updateCycle }: JournalViewProps) {
    const {
        today,
        showComposer,
        setShowComposer,
        composerType,
        setComposerType,
        customDate,
        setCustomDate,
        customTitle,
        setCustomTitle,
        customContent,
        setCustomContent,
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
    const contextLabelById = useMemo(() => {
        const map = new Map<string, string>();
        (cycle.journalContexts ?? []).forEach((context) => {
            map.set(context.id, context.label);
        });
        return map;
    }, [cycle.journalContexts]);
    const contextOptions = useMemo<Array<FilterOption<string>>>(() => {
        return (cycle.journalContexts ?? []).map((context) => ({
            id: context.id,
            labelKey: context.label
        }));
    }, [cycle.journalContexts]);

    const filteredEntries = useMemo(() => {
        const activeContextFilter = contextFilter.filter((id) => contextLabelById.has(id));
        return allEntries.filter((entry) => {
            if (typeFilter !== "all" && entry.type !== typeFilter) return false;
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

    const handleNavigateEntry = (entry: ReviewEntry) => {
        if (entry.type === "daily") {
            setSelectedDate(entry.date);
            setActiveTab("today");
            return;
        }
        if (entry.type === "weekly") {
            const weekIndex = entry.weekIndex ?? getWeekIndexForDate(cycle, entry.date);
            setSelectedWeek(weekIndex);
            setActiveTab("week");
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

    return (
        <section className="card journal-view">
            <div className="journal-header">
                <div>
                    <h2>{tr(language, "journal.title")}</h2>
                    <p className="muted journal-subtitle">{tr(language, "journal.subtitle")}</p>
                </div>
                <button
                    className="primary journal-add-btn"
                    disabled={readOnly}
                    onClick={() => setShowComposer((prev) => !prev)}
                    title={tr(language, "journal.addEntry")}
                >
                    + {tr(language, "journal.addEntry")}
                </button>
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
                customSignals={customSignals}
                toggleCustomSignal={toggleCustomSignal}
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
            />

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
                contextLabelById={contextLabelById}
                handleNavigateEntry={handleNavigateEntry}
                handleDeleteEntry={handleDeleteEntry}
            />
        </section>
    );
}
