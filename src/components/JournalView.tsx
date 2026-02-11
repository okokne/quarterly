import { AppLanguage, Cycle, DateFormat } from "../types";
import { t as tr } from "../i18n";
import { formatDate } from "../utils";

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
    const weeklyEntries = Object.entries(cycle.weeklyReviews)
        .filter(([, review]) => review.good || review.bad || review.change)
        .sort(([a], [b]) => Number(b) - Number(a)); // Sort newest first

    const dailyEntries = Object.entries(cycle.dailyReviews)
        .filter(([, review]) => review.good || review.bad)
        .sort(([a], [b]) => b.localeCompare(a)); // Sort newest first

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

    return (
        <section className="card">
            <h2>{tr(language, "journal.title")}</h2>
            {readOnly && <p className="readonly-note">{tr(language, "app.archiveReadOnlyMode")}</p>}
            <p className="muted" style={{ marginBottom: '20px' }}>{tr(language, "journal.subtitle")}</p>

            <div className="subcard">
                <h3>{tr(language, "journal.weeklyReviews")}</h3>
                {weeklyEntries.length === 0 ? (
                    <p className="empty">{tr(language, "journal.noWeeklyReviews")}</p>
                ) : (
                    <div className="list">
                        {weeklyEntries.map(([weekNum, review]) => (
                            <div key={weekNum} className="list-item">
                                <div style={{ cursor: 'pointer', flex: 1 }} onClick={() => { setSelectedWeek(Number(weekNum)); setActiveTab("week"); }}>
                                    <strong>{tr(language, "app.headerWeekShort", { week: weekNum })}</strong>
                                    <div className="muted" style={{ marginTop: '4px' }}>
                                        {review.good && <span>✅ {review.good.slice(0, 60)}{review.good.length > 60 ? '...' : ''}</span>}
                                    </div>
                                </div>
                                <button className="ghost-danger" disabled={readOnly} onClick={() => handleDeleteWeekly(weekNum)} title={tr(language, "journal.deleteEntry")}>
                                    🗑
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="subcard">
                <h3>{tr(language, "journal.dailyReviews")}</h3>
                {dailyEntries.length === 0 ? (
                    <p className="empty">{tr(language, "journal.noDailyReviews")}</p>
                ) : (
                    <div className="list">
                        {dailyEntries.map(([date, review]) => (
                            <div key={date} className="list-item">
                                <div style={{ cursor: 'pointer', flex: 1 }} onClick={() => { setSelectedDate(date); setActiveTab("today"); }}>
                                    <strong>{formatDate(date, dateFormat, language)}</strong>
                                    <div className="muted" style={{ marginTop: '4px' }}>
                                        {review.good && <span>✅ {review.good.slice(0, 60)}{review.good.length > 60 ? '...' : ''}</span>}
                                    </div>
                                </div>
                                <button className="ghost-danger" disabled={readOnly} onClick={() => handleDeleteDaily(date)} title={tr(language, "journal.deleteEntry")}>
                                    🗑
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}
