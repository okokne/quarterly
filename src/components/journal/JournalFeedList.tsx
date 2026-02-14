import { CSSProperties, Dispatch, SetStateAction } from "react";
import { ArrowRight, Pencil, X } from "lucide-react";
import { t as tr } from "../../i18n";
import { AppLanguage, Cycle, DateFormat, JournalContext, ReviewEntry } from "../../types";
import { formatDate, getReviewEntrySignals, getWeekIndexForDate, getWeekLabel } from "../../utils";
import { monthLabel, previewText } from "./helpers";
import { SIGNAL_LABEL_SUFFIX } from "./types";
import { Icon } from "../ui/Icon";

type JournalFeedListProps = {
    cycle: Cycle;
    language: AppLanguage;
    dateFormat: DateFormat;
    readOnly: boolean;
    allEntriesCount: number;
    filteredEntriesCount: number;
    groupedEntries: Array<[string, ReviewEntry[]]>;
    currentMonthKey: string;
    openMonths: Record<string, boolean>;
    setOpenMonths: Dispatch<SetStateAction<Record<string, boolean>>>;
    contextById: Map<string, JournalContext>;
    handleNavigateEntry: (entry: ReviewEntry) => void;
    handleDeleteEntry: (entryId: string) => void;
    onOpenContextSettings: (contextId: string) => void;
};

export function JournalFeedList({
    cycle,
    language,
    dateFormat,
    readOnly,
    allEntriesCount,
    filteredEntriesCount,
    groupedEntries,
    currentMonthKey,
    openMonths,
    setOpenMonths,
    contextById,
    handleNavigateEntry,
    handleDeleteEntry,
    onOpenContextSettings
}: JournalFeedListProps) {
    return (
        <div className="subcard journal-feed-root">
            {allEntriesCount === 0 && <p className="empty">{tr(language, "journal.noEntries")}</p>}
            {allEntriesCount > 0 && filteredEntriesCount === 0 && (
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
                                    const context = entry.contextId ? contextById.get(entry.contextId) : undefined;
                                    const isQuickNote = entry.type === "quick";
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
                                                <Icon icon={X} size={14} />
                                            </button>

                                            <div className="journal-entry-meta-row">
                                                <span className={`journal-entry-type ${entry.type}`}>{tr(language, `journal.filterType${entry.type.charAt(0).toUpperCase()}${entry.type.slice(1)}`)}</span>
                                                {context && (
                                                    <>
                                                        <span
                                                            className="journal-entry-context"
                                                            style={{ "--journal-context-bg": context.color } as CSSProperties}
                                                        >
                                                            {context.label}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            className="journal-context-edit-btn"
                                                            title={tr(language, "journal.editContext")}
                                                            aria-label={tr(language, "journal.editContext")}
                                                            disabled={readOnly}
                                                            onClick={(event) => {
                                                                event.stopPropagation();
                                                                onOpenContextSettings(context.id);
                                                            }}
                                                        >
                                                            <Icon icon={Pencil} size={12} />
                                                        </button>
                                                    </>
                                                )}
                                                <span className="journal-entry-meta-dot">·</span>
                                                <span className="journal-entry-date">
                                                    {entry.type === "weekly"
                                                        ? `${getWeekLabel(cycle, weekIndex, language)} · ${formatDate(entry.date, dateFormat, language)}`
                                                        : formatDate(entry.date, dateFormat, language)}
                                                </span>
                                                {!isQuickNote && (
                                                    <div className="journal-entry-signal-row">
                                                        {signals.map((signal) => (
                                                            <span key={`${entry.id}-${signal}`} className={`journal-entry-signal ${signal}`}>
                                                                {tr(language, `journal.signal${SIGNAL_LABEL_SUFFIX[signal]}`)}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {(entry.type === "custom" || entry.type === "quick") && entry.title && <h4>{entry.title}</h4>}
                                            {entry.type !== "custom" && entry.type !== "quick" && (
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
                                                    {entry.change && (
                                                        <p className="journal-entry-line neutral">
                                                            <Icon icon={ArrowRight} size={13} /> {entry.change}
                                                        </p>
                                                    )}
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
    );
}
