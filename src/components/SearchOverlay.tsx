import { Search, Target, BarChart3, Clock3, X } from "lucide-react";
import { AppLanguage, DateFormat } from "../types";
import { SearchResultItem } from "../types/search";
import { t as tr } from "../i18n";
import { buildWeekLabel, formatDate } from "../utils";
import { Icon } from "./ui/Icon";

type SearchOverlayProps = {
    open: boolean;
    language: AppLanguage;
    dateFormat: DateFormat;
    searchQuery: string;
    setSearchQuery: (value: string) => void;
    searchResults: SearchResultItem[];
    onClose: () => void;
    onSelectResult: (result: SearchResultItem) => void;
};

export function SearchOverlay({
    open,
    language,
    dateFormat,
    searchQuery,
    setSearchQuery,
    searchResults,
    onClose,
    onSelectResult
}: SearchOverlayProps) {
    if (!open) return null;
    const goalType = tr(language, "app.searchTypeGoal");
    const targetType = tr(language, "app.searchTypeTarget");
    const blockType = tr(language, "app.searchTypeBlock");

    return (
        <div className="overlay-backdrop" onClick={onClose}>
            <div className="overlay-card search-overlay-card" onClick={(event) => event.stopPropagation()}>
                <div className="overlay-header">
                    <h3>{tr(language, "app.searchTitle")}</h3>
                    <button className="icon-btn" onClick={onClose} aria-label={tr(language, "common.close")}>
                        <Icon icon={X} />
                    </button>
                </div>
                <input
                    className="search-overlay-input"
                    type="text"
                    autoFocus
                    placeholder={tr(language, "app.searchPlaceholder")}
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                />
                <div className="search-overlay-results">
                    {searchQuery.trim().length === 0 && (
                        <p className="muted">{tr(language, "app.searchHint")}</p>
                    )}
                    {searchQuery.trim().length > 0 && searchResults.length === 0 && (
                        <p className="muted">{tr(language, "app.searchNoResults")}</p>
                    )}
                    {searchResults.map((result, index) => (
                        <button
                            key={`${result.type}-${result.text}-${index}`}
                            className="search-result-item"
                            onClick={() => {
                                onSelectResult(result);
                                onClose();
                            }}
                        >
                            <span className="search-type">
                                <Icon
                                    icon={
                                        result.type === goalType
                                            ? Target
                                            : result.type === targetType
                                                ? BarChart3
                                                : result.type === blockType
                                                    ? Clock3
                                                    : Search
                                    }
                                    size={14}
                                />
                            </span>
                            <span className="search-type-label">{result.type}</span>
                            <span>{result.text}</span>
                            {result.week && <span className="muted">{buildWeekLabel(language, result.week, result.weekName)}</span>}
                            {result.date && <span className="muted">{formatDate(result.date, dateFormat, language)}</span>}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
