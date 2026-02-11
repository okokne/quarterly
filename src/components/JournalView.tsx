import { useMemo, useState } from "react";
import { AppLanguage, Cycle, DateFormat } from "../types";
import { t as tr } from "../i18n";
import { formatDate, toIsoDate, uid } from "../utils";

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
    const [showNewEntryForm, setShowNewEntryForm] = useState(false);
    const [entryTitle, setEntryTitle] = useState("");
    const [entryDate, setEntryDate] = useState(() => toIsoDate(new Date()));
    const [entryContent, setEntryContent] = useState("");

    const weeklyEntries = Object.entries(cycle.weeklyReviews)
        .filter(([, review]) => review.good || review.bad || review.change)
        .sort(([a], [b]) => Number(b) - Number(a));

    const dailyEntries = Object.entries(cycle.dailyReviews)
        .filter(([, review]) => review.good || review.bad)
        .sort(([a], [b]) => b.localeCompare(a));

    const customEntries = useMemo(
        () => [...(cycle.journalEntries ?? [])].sort((a, b) => b.date.localeCompare(a.date)),
        [cycle.journalEntries]
    );

    const handleDeleteWeekly = (weekNum: string) => {
        if (readOnly) return;
        if (!window.confirm(tr(language, "journal.deleteWeeklyConfirm", { week: weekNum }))) return;
        updateCycle(prev => {
            const newReviews = { ...prev.weeklyReviews };
            delete newReviews[Number(weekNum)];
            return { ...prev, weeklyReviews: newReviews };
        });
    };

    const handleDeleteDaily = (date: string) => {
        if (readOnly) return;
        if (!window.confirm(tr(language, "journal.deleteDailyConfirm", { date: formatDate(date, dateFormat, language) }))) return;
        updateCycle(prev => {
            const newReviews = { ...prev.dailyReviews };
            delete newReviews[date];
            return { ...prev, dailyReviews: newReviews };
        });
    };

    const handleCreateEntry = () => {
        if (readOnly) return;
        const title = entryTitle.trim();
        if (!title) return;

        updateCycle((prev) => ({
            ...prev,
            journalEntries: [
                {
                    id: uid(),
                    title,
                    content: entryContent.trim(),
                    date: entryDate,
                    createdAt: new Date().toISOString()
                },
                ...(prev.journalEntries ?? [])
            ]
        }));

        setEntryTitle("");
        setEntryContent("");
        setEntryDate(toIsoDate(new Date()));
        setShowNewEntryForm(false);
    };

    const handleDeleteEntry = (entryId: string) => {
        if (readOnly) return;
        if (!window.confirm(tr(language, "journal.deleteEntryConfirm"))) return;
        updateCycle((prev) => ({
            ...prev,
            journalEntries: (prev.journalEntries ?? []).filter((entry) => entry.id !== entryId)
        }));
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
                    onClick={() => setShowNewEntryForm((prev) => !prev)}
                    title={tr(language, "journal.addEntry")}
                >
                    + {tr(language, "journal.addEntry")}
                </button>
            </div>

            {readOnly && <p className="readonly-note">{tr(language, "app.archiveReadOnlyMode")}</p>}

            {showNewEntryForm && (
                <div className="subcard journal-entry-form">
                    <h3>{tr(language, "journal.newEntry")}</h3>
                    <div className="grid">
                        <label>
                            {tr(language, "common.title")}
                            <input
                                value={entryTitle}
                                onChange={(e) => setEntryTitle(e.target.value)}
                                placeholder={tr(language, "journal.entryTitlePlaceholder")}
                            />
                        </label>
                        <label>
                            {tr(language, "journal.entryDate")}
                            <input
                                type="date"
                                value={entryDate}
                                onChange={(e) => setEntryDate(e.target.value)}
                            />
                        </label>
                    </div>
                    <label>
                        {tr(language, "journal.entryBodyOptional")}
                        <textarea
                            value={entryContent}
                            onChange={(e) => setEntryContent(e.target.value)}
                            placeholder={tr(language, "journal.entryBodyPlaceholder")}
                        />
                    </label>
                    <div className="button-row">
                        <button className="primary" onClick={handleCreateEntry} disabled={!entryTitle.trim()}>{tr(language, "common.save")}</button>
                        <button onClick={() => setShowNewEntryForm(false)}>{tr(language, "common.cancel")}</button>
                    </div>
                </div>
            )}

            <div className="subcard">
                <h3>{tr(language, "journal.customEntries")}</h3>
                {customEntries.length === 0 ? (
                    <p className="empty">{tr(language, "journal.noCustomEntries")}</p>
                ) : (
                    <div className="journal-card-list">
                        {customEntries.map((entry) => (
                            <article key={entry.id} className="journal-card">
                                <button
                                    className="journal-delete-x"
                                    disabled={readOnly}
                                    title={tr(language, "journal.deleteEntry")}
                                    aria-label={tr(language, "journal.deleteEntry")}
                                    onClick={() => handleDeleteEntry(entry.id)}
                                >
                                    ✕
                                </button>
                                <div className="journal-card-date">{formatDate(entry.date, dateFormat, language)}</div>
                                <h4>{entry.title}</h4>
                                {entry.content && <p>{entry.content}</p>}
                            </article>
                        ))}
                    </div>
                )}
            </div>

            <div className="subcard">
                <h3>{tr(language, "journal.weeklyReviews")}</h3>
                {weeklyEntries.length === 0 ? (
                    <p className="empty">{tr(language, "journal.noWeeklyReviews")}</p>
                ) : (
                    <div className="journal-card-list">
                        {weeklyEntries.map(([weekNum, review]) => (
                            <article key={weekNum} className="journal-card clickable" onClick={() => { setSelectedWeek(Number(weekNum)); setActiveTab("week"); }}>
                                <button
                                    className="journal-delete-x"
                                    disabled={readOnly}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteWeekly(weekNum);
                                    }}
                                    title={tr(language, "journal.deleteEntry")}
                                    aria-label={tr(language, "journal.deleteEntry")}
                                >
                                    ✕
                                </button>
                                <div className="journal-card-date">{tr(language, "app.headerWeekShort", { week: weekNum })}</div>
                                <h4>{tr(language, "journal.weeklySummary")}</h4>
                                <p>
                                    {review.good || review.bad || review.change}
                                </p>
                            </article>
                        ))}
                    </div>
                )}
            </div>

            <div className="subcard">
                <h3>{tr(language, "journal.dailyReviews")}</h3>
                {dailyEntries.length === 0 ? (
                    <p className="empty">{tr(language, "journal.noDailyReviews")}</p>
                ) : (
                    <div className="journal-card-list">
                        {dailyEntries.map(([date, review]) => (
                            <article key={date} className="journal-card clickable" onClick={() => { setSelectedDate(date); setActiveTab("today"); }}>
                                <button
                                    className="journal-delete-x"
                                    disabled={readOnly}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteDaily(date);
                                    }}
                                    title={tr(language, "journal.deleteEntry")}
                                    aria-label={tr(language, "journal.deleteEntry")}
                                >
                                    ✕
                                </button>
                                <div className="journal-card-date">{formatDate(date, dateFormat, language)}</div>
                                <h4>{tr(language, "journal.dailySummary")}</h4>
                                <p>{review.good || review.bad}</p>
                            </article>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}
