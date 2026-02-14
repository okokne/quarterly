import { Dispatch, SetStateAction } from "react";
import { t as tr } from "../../i18n";
import { AppLanguage, ReviewSignal } from "../../types";
import { FeedRangeFilter, FeedTypeFilter, FilterOption } from "./types";

type JournalFeedToolbarProps = {
    language: AppLanguage;
    searchQuery: string;
    setSearchQuery: Dispatch<SetStateAction<string>>;
    typeFilter: FeedTypeFilter;
    setTypeFilter: Dispatch<SetStateAction<FeedTypeFilter>>;
    typeOptions: Array<FilterOption<FeedTypeFilter>>;
    signalFilter: ReviewSignal[];
    setSignalFilter: Dispatch<SetStateAction<ReviewSignal[]>>;
    signalOptions: Array<FilterOption<ReviewSignal>>;
    toggleSignalSelection: (signal: ReviewSignal) => void;
    rangeFilter: FeedRangeFilter;
    setRangeFilter: Dispatch<SetStateAction<FeedRangeFilter>>;
    rangeOptions: Array<FilterOption<FeedRangeFilter>>;
    contextFilter: string[];
    setContextFilter: Dispatch<SetStateAction<string[]>>;
    contextOptions: Array<FilterOption<string>>;
    toggleContextSelection: (contextId: string) => void;
};

export function JournalFeedToolbar({
    language,
    searchQuery,
    setSearchQuery,
    typeFilter,
    setTypeFilter,
    typeOptions,
    signalFilter,
    setSignalFilter,
    signalOptions,
    toggleSignalSelection,
    rangeFilter,
    setRangeFilter,
    rangeOptions,
    contextFilter,
    setContextFilter,
    contextOptions,
    toggleContextSelection
}: JournalFeedToolbarProps) {
    return (
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

            <div className="journal-filter-row">
                <span className="journal-filter-label">{tr(language, "journal.filterContext")}</span>
                <div className="journal-filter-chip-row">
                    <button
                        className={`journal-filter-chip ${contextFilter.length === 0 ? "active" : ""}`}
                        onClick={() => setContextFilter([])}
                    >
                        {tr(language, "journal.contextAll")}
                    </button>
                    {contextOptions.map((option) => (
                        <button
                            key={option.id}
                            className={`journal-filter-chip ${contextFilter.includes(option.id) ? "active" : ""}`}
                            onClick={() => toggleContextSelection(option.id)}
                        >
                            {option.labelKey}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
