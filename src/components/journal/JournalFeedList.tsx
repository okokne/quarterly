import { CSSProperties, Dispatch, SetStateAction } from "react";
import { ArrowRight, ChevronRight, Pencil, X } from "lucide-react";
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
    handleOpenEntry: (entry: ReviewEntry) => void;
    handleDeleteEntry: (entryId: string) => void;
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
    handleOpenEntry,
    handleDeleteEntry
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
                                    const isNoteEntry = entry.type === "custom" || entry.type === "quick";
                                    const isReviewEntry = entry.type === "daily" || entry.type === "weekly";
                                    const isClickable = isNoteEntry || isReviewEntry;
                                    const weekIndex = entry.weekIndex ?? getWeekIndexForDate(cycle, entry.date);
                                    const context = entry.contextId ? contextById.get(entry.contextId) : undefined;
                                    const typeLabelKey = isNoteEntry
                                        ? "journal.filterTypeQuick"
                                        : `journal.filterType${entry.type.charAt(0).toUpperCase()}${entry.type.slice(1)}`;
                                    const typeClassName = isNoteEntry ? "note" : entry.type;
                                    return (
                                        <article
                                            key={entry.id}
                                            className={`journal-entry-card ${isClickable ? "clickable" : ""}`}
                                            onClick={() => {
                                                if (!isClickable) return;
                                                handleOpenEntry(entry);
                                            }}
                                        >
                                            <span className={`journal-entry-mode-icon ${isNoteEntry ? "note" : "review"}`} aria-hidden="true">
                                                <Icon icon={isNoteEntry ? Pencil : ChevronRight} size={12} />
                                            </span>
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
                                                <span className={`journal-entry-type ${typeClassName}`}>{tr(language, typeLabelKey)}</span>
                                                {context && (
                                                    <span
                                                        className="journal-entry-context"
                                                        style={{ "--journal-context-bg": context.color } as CSSProperties}
                                                    >
                                                        {context.label}
                                                    </span>
                                                )}
                                                <span className="journal-entry-meta-dot">·</span>
                                                <span className="journal-entry-date">
                                                    {entry.type === "weekly"
                                                        ? `${getWeekLabel(cycle, weekIndex, language)} · ${formatDate(entry.date, dateFormat, language)}`
                                                        : formatDate(entry.date, dateFormat, language)}
                                                </span>
                                                {!isNoteEntry && (
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
