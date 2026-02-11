import { useEffect, useMemo, useState } from "react";
import { AppLanguage, Cycle, DateFormat, ReviewEntry, ReviewEntryType, ReviewSignal } from "../types";
import { t as tr } from "../i18n";
import {
    createJournalCustomReviewEntry,
    createJournalDailyReviewEntry,
    createJournalWeeklyReviewEntry,
    formatDate,
    getReviewEntrySignals,
    getReviewEntrySearchText,
    getWeekIndexForDate,
    matchesSignalFilter,
    getWritableReviewEntries,
    toIsoDate
} from "../utils";

type Tab = "today" | "week" | "stats" | "journal";
type FeedTypeFilter = "all" | ReviewEntryType;
type FeedRangeFilter = "all" | "current_week" | "current_month" | "quarter";
type ComposerType = "daily" | "weekly" | "custom";

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

function monthLabel(monthKey: string, language: AppLanguage): string {
    const [yearRaw, monthRaw] = monthKey.split("-");
    const year = Number.parseInt(yearRaw ?? "", 10);
    const month = Number.parseInt(monthRaw ?? "", 10);
    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
        return monthKey;
    }

    const locale = language === "de" ? "de-DE" : "en-US";
    return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(new Date(year, month - 1, 1));
}

function previewText(entry: ReviewEntry): string {
    if (entry.type === "custom") {
        const title = entry.title?.trim() ?? "";
        const body = entry.content?.trim() ?? "";
        return [title, body].filter(Boolean).join(" · ");
    }

    const parts = [entry.good?.trim(), entry.bad?.trim(), entry.change?.trim()].filter(Boolean);
    return parts.join(" · ");
}

export function JournalView({ cycle, language, dateFormat, readOnly, setSelectedWeek, setSelectedDate, setActiveTab, updateCycle }: JournalViewProps) {
    const today = toIsoDate(new Date());
    const currentMonthKey = today.slice(0, 7);
    const currentWeek = useMemo(() => {
        return cycle.weeks.find((week) => today >= week.startDate && today <= week.endDate) ?? cycle.weeks[0];
    }, [cycle.weeks, today]);
    const quarterStart = cycle.startDate;
    const quarterEnd = cycle.weeks[cycle.weeks.length - 1]?.endDate ?? cycle.startDate;

    const [showComposer, setShowComposer] = useState(false);
    const [composerType, setComposerType] = useState<ComposerType>("custom");

    const [customDate, setCustomDate] = useState(() => toIsoDate(new Date()));
    const [customTitle, setCustomTitle] = useState("");
    const [customContent, setCustomContent] = useState("");
    const [customSignals, setCustomSignals] = useState<ReviewSignal[]>([]);

    const [dailyDate, setDailyDate] = useState(() => toIsoDate(new Date()));
    const [dailyGood, setDailyGood] = useState("");
    const [dailyBad, setDailyBad] = useState("");

    const [weeklyWeek, setWeeklyWeek] = useState(() => String(Math.max(1, getWeekIndexForDate(cycle, today))));
    const [weeklyGood, setWeeklyGood] = useState("");
    const [weeklyBad, setWeeklyBad] = useState("");
    const [weeklyChange, setWeeklyChange] = useState("");

    const [searchQuery, setSearchQuery] = useState("");
    const [typeFilter, setTypeFilter] = useState<FeedTypeFilter>("all");
    const [signalFilter, setSignalFilter] = useState<ReviewSignal[]>([]);
    const [rangeFilter, setRangeFilter] = useState<FeedRangeFilter>("all");
    const [openMonths, setOpenMonths] = useState<Record<string, boolean>>({});

    const allEntries = useMemo(() => getWritableReviewEntries(cycle), [
        cycle,
        cycle.reviewEntries,
        cycle.dailyReviews,
        cycle.weeklyReviews,
        cycle.journalEntries
    ]);

    const normalizedSearch = searchQuery.trim().toLowerCase();

    const filteredEntries = useMemo(() => {
        return allEntries.filter((entry) => {
            if (typeFilter !== "all" && entry.type !== typeFilter) return false;
            if (!matchesSignalFilter(entry, signalFilter)) return false;

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
        currentMonthKey,
        currentWeek,
        normalizedSearch,
        quarterEnd,
        quarterStart,
        rangeFilter,
        signalFilter,
        typeFilter
    ]);

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
    }, [groupedEntries, currentMonthKey]);

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

    const resetComposerFields = () => {
        setCustomDate(toIsoDate(new Date()));
        setCustomTitle("");
        setCustomContent("");
        setCustomSignals([]);
        setDailyDate(toIsoDate(new Date()));
        setDailyGood("");
        setDailyBad("");
        setWeeklyGood("");
        setWeeklyBad("");
        setWeeklyChange("");
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

    const toggleSignalSelection = (signal: ReviewSignal) => {
        setSignalFilter((prev) => (
            prev.includes(signal)
                ? prev.filter((item) => item !== signal)
                : [...prev, signal]
        ));
    };

    const toggleCustomSignal = (signal: ReviewSignal) => {
        setCustomSignals((prev) => (
            prev.includes(signal)
                ? prev.filter((item) => item !== signal)
                : [...prev, signal]
        ));
    };

    const composerSubmitDisabled = useMemo(() => {
        if (composerType === "custom") {
            return !customTitle.trim() && !customContent.trim();
        }
        if (composerType === "daily") {
            return !dailyGood.trim() && !dailyBad.trim();
        }
        return !weeklyGood.trim() && !weeklyBad.trim() && !weeklyChange.trim();
    }, [composerType, customContent, customTitle, dailyBad, dailyGood, weeklyBad, weeklyChange, weeklyGood]);

    const typeOptions: Array<{ id: FeedTypeFilter; labelKey: string }> = [
        { id: "all", labelKey: "journal.filterTypeAll" },
        { id: "daily", labelKey: "journal.filterTypeDaily" },
        { id: "weekly", labelKey: "journal.filterTypeWeekly" },
        { id: "custom", labelKey: "journal.filterTypeCustom" }
    ];

    const signalOptions: Array<{ id: ReviewSignal; labelKey: string }> = [
        { id: "win", labelKey: "journal.signalWin" },
        { id: "challenge", labelKey: "journal.signalChallenge" },
        { id: "next_step", labelKey: "journal.signalNextStep" },
        { id: "note", labelKey: "journal.signalNote" }
    ];

    const rangeOptions: Array<{ id: FeedRangeFilter; labelKey: string }> = [
        { id: "all", labelKey: "journal.rangeAll" },
        { id: "current_week", labelKey: "journal.rangeCurrentWeek" },
        { id: "current_month", labelKey: "journal.rangeCurrentMonth" },
        { id: "quarter", labelKey: "journal.rangeQuarter" }
    ];

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

            {showComposer && (
                <div className="subcard journal-entry-form">
                    <h3>{tr(language, "journal.newEntry")}</h3>
                    <div className="journal-composer-type-row">
                        <button className={`journal-filter-chip ${composerType === "custom" ? "active" : ""}`} onClick={() => setComposerType("custom")}>{tr(language, "journal.filterTypeCustom")}</button>
                        <button className={`journal-filter-chip ${composerType === "daily" ? "active" : ""}`} onClick={() => setComposerType("daily")}>{tr(language, "journal.filterTypeDaily")}</button>
                        <button className={`journal-filter-chip ${composerType === "weekly" ? "active" : ""}`} onClick={() => setComposerType("weekly")}>{tr(language, "journal.filterTypeWeekly")}</button>
                    </div>

                    {composerType === "custom" && (
                        <>
                            <div className="grid">
                                <label>
                                    {tr(language, "common.title")}
                                    <input
                                        value={customTitle}
                                        onChange={(e) => setCustomTitle(e.target.value)}
                                        placeholder={tr(language, "journal.entryTitlePlaceholder")}
                                    />
                                </label>
                                <label>
                                    {tr(language, "journal.entryDate")}
                                    <input
                                        type="date"
                                        value={customDate}
                                        onChange={(e) => setCustomDate(e.target.value)}
                                    />
                                </label>
                            </div>
                            <div className="journal-filter-row">
                                <span className="journal-filter-label">{tr(language, "journal.filterSignals")}</span>
                                <div className="journal-filter-chip-row">
                                    {signalOptions.map((option) => (
                                        <button
                                            key={option.id}
                                            className={`journal-filter-chip ${customSignals.includes(option.id) ? "active" : ""}`}
                                            onClick={() => toggleCustomSignal(option.id)}
                                        >
                                            {tr(language, option.labelKey)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <label>
                                {tr(language, "journal.entryBodyOptional")}
                                <textarea
                                    value={customContent}
                                    onChange={(e) => setCustomContent(e.target.value)}
                                    placeholder={tr(language, "journal.entryBodyPlaceholder")}
                                />
                            </label>
                        </>
                    )}

                    {composerType === "daily" && (
                        <>
                            <div className="grid">
                                <label>
                                    {tr(language, "journal.entryDate")}
                                    <input
                                        type="date"
                                        value={dailyDate}
                                        onChange={(e) => setDailyDate(e.target.value)}
                                    />
                                </label>
                            </div>
                            <div className="grid">
                                <label>
                                    {tr(language, "review.good")}
                                    <textarea
                                        value={dailyGood}
                                        onChange={(e) => setDailyGood(e.target.value)}
                                    />
                                </label>
                                <label>
                                    {tr(language, "review.bad")}
                                    <textarea
                                        value={dailyBad}
                                        onChange={(e) => setDailyBad(e.target.value)}
                                    />
                                </label>
                            </div>
                        </>
                    )}

                    {composerType === "weekly" && (
                        <>
                            <label>
                                {tr(language, "week.select")}
                                <select value={weeklyWeek} onChange={(e) => setWeeklyWeek(e.target.value)}>
                                    {cycle.weeks.map((week) => (
                                        <option key={week.index} value={week.index}>
                                            {tr(language, "app.headerWeekShort", { week: week.index })}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <div className="grid">
                                <label>
                                    {tr(language, "review.good")}
                                    <textarea
                                        value={weeklyGood}
                                        onChange={(e) => setWeeklyGood(e.target.value)}
                                    />
                                </label>
                                <label>
                                    {tr(language, "review.bad")}
                                    <textarea
                                        value={weeklyBad}
                                        onChange={(e) => setWeeklyBad(e.target.value)}
                                    />
                                </label>
                                <label>
                                    {tr(language, "review.changeNextWeek")}
                                    <textarea
                                        value={weeklyChange}
                                        onChange={(e) => setWeeklyChange(e.target.value)}
                                    />
                                </label>
                            </div>
                        </>
                    )}

                    <div className="button-row">
                        <button className="primary" onClick={handleCreateEntry} disabled={composerSubmitDisabled}>{tr(language, "common.save")}</button>
                        <button onClick={() => setShowComposer(false)}>{tr(language, "common.cancel")}</button>
                    </div>
                </div>
            )}

            <div className="subcard journal-feed-toolbar">
                <label>
                    {tr(language, "journal.search")}
                    <input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={tr(language, "journal.searchPlaceholder")}
                    />
                </label>

                <div className="journal-filter-row">
                    <span className="journal-filter-label">{tr(language, "journal.filterType")}</span>
                    <div className="journal-filter-chip-row">
                        {typeOptions.map((option) => (
                            <button
                                key={option.id}
                                className={`journal-filter-chip ${typeFilter === option.id ? "active" : ""}`}
                                onClick={() => setTypeFilter(option.id)}
                            >
                                {tr(language, option.labelKey)}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="journal-filter-row">
                    <span className="journal-filter-label">{tr(language, "journal.filterSignals")}</span>
                    <div className="journal-filter-chip-row">
                        <button
                            className={`journal-filter-chip ${signalFilter.length === 0 ? "active" : ""}`}
                            onClick={() => setSignalFilter([])}
                        >
                            {tr(language, "journal.signalAll")}
                        </button>
                        {signalOptions.map((option) => (
                            <button
                                key={option.id}
                                className={`journal-filter-chip ${signalFilter.includes(option.id) ? "active" : ""}`}
                                onClick={() => toggleSignalSelection(option.id)}
                            >
                                {tr(language, option.labelKey)}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="journal-filter-row">
                    <span className="journal-filter-label">{tr(language, "journal.filterRange")}</span>
                    <div className="journal-filter-chip-row">
                        {rangeOptions.map((option) => (
                            <button
                                key={option.id}
                                className={`journal-filter-chip ${rangeFilter === option.id ? "active" : ""}`}
                                onClick={() => setRangeFilter(option.id)}
                            >
                                {tr(language, option.labelKey)}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="subcard journal-feed-root">
                {allEntries.length === 0 && <p className="empty">{tr(language, "journal.noEntries")}</p>}
                {allEntries.length > 0 && filteredEntries.length === 0 && (
                    <p className="empty">{tr(language, "journal.noResults")}</p>
                )}

                {groupedEntries.map(([monthKey, entries]) => {
                    const isOpen = openMonths[monthKey] ?? monthKey === currentMonthKey;
                    return (
                        <section key={monthKey} className="journal-month-group">
                            <button
                                type="button"
                                className="journal-month-toggle"
                                onClick={() => setOpenMonths((prev) => ({ ...prev, [monthKey]: !isOpen }))}
                            >
                                <span>{monthLabel(monthKey, language)}</span>
                                <span className="journal-month-meta">{entries.length}</span>
                            </button>

                            {isOpen && (
                                <div className="journal-card-list">
                                    {entries.map((entry) => {
                                        const signals = getReviewEntrySignals(entry);
                                        const isClickable = entry.type === "daily" || entry.type === "weekly";
                                        const weekIndex = entry.weekIndex ?? getWeekIndexForDate(cycle, entry.date);
                                        return (
                                            <article
                                                key={entry.id}
                                                className={`journal-entry-card ${isClickable ? "clickable" : ""}`}
                                                onClick={() => {
                                                    if (!isClickable) return;
                                                    handleNavigateEntry(entry);
                                                }}
                                            >
                                                <button
                                                    className="journal-delete-x"
                                                    disabled={readOnly}
                                                    title={tr(language, "journal.deleteEntry")}
                                                    aria-label={tr(language, "journal.deleteEntry")}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteEntry(entry.id);
                                                    }}
                                                >
                                                    ✕
                                                </button>

                                                <div className="journal-entry-meta-row">
                                                    <span className={`journal-entry-type ${entry.type}`}>{tr(language, `journal.filterType${entry.type.charAt(0).toUpperCase()}${entry.type.slice(1)}`)}</span>
                                                    <div className="journal-entry-signal-row">
                                                        {signals.map((signal) => (
                                                            <span key={`${entry.id}-${signal}`} className={`journal-entry-signal ${signal}`}>
                                                                {tr(language, `journal.signal${signal === "next_step" ? "NextStep" : signal.charAt(0).toUpperCase() + signal.slice(1)}`)}
                                                            </span>
                                                        ))}
                                                    </div>
                                                    <span className="journal-card-date">
                                                        {entry.type === "weekly"
                                                            ? `${tr(language, "app.headerWeekShort", { week: weekIndex })} · ${formatDate(entry.date, dateFormat, language)}`
                                                            : formatDate(entry.date, dateFormat, language)}
                                                    </span>
                                                </div>

                                                {entry.type === "custom" && entry.title && <h4>{entry.title}</h4>}
                                                {entry.type !== "custom" && (
                                                    <h4>
                                                        {entry.type === "daily"
                                                            ? tr(language, "journal.dailySummary")
                                                            : tr(language, "journal.weeklySummary")}
                                                    </h4>
                                                )}

                                                {entry.type === "daily" || entry.type === "weekly" ? (
                                                    <div className="journal-entry-lines">
                                                        {entry.good && <p className="journal-entry-line positive">+ {entry.good}</p>}
                                                        {entry.bad && <p className="journal-entry-line negative">- {entry.bad}</p>}
                                                        {entry.change && <p className="journal-entry-line neutral">→ {entry.change}</p>}
                                                    </div>
                                                ) : (
                                                    <p className="journal-entry-preview">{previewText(entry)}</p>
                                                )}
                                            </article>
                                        );
                                    })}
                                </div>
                            )}
                        </section>
                    );
                })}
            </div>
        </section>
    );
}
