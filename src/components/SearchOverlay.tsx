import { AppLanguage, DateFormat } from "../types";
import { SearchResultItem } from "../types/search";
import { t as tr } from "../i18n";
import { formatDate } from "../utils";

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

    return (
        <div className="overlay-backdrop" onClick={onClose}>
            <div className="overlay-card search-overlay-card" onClick={(event) => event.stopPropagation()}>
                <div className="overlay-header">
                    <h3>{tr(language, "app.searchTitle")}</h3>
                    <button className="icon-btn" onClick={onClose} aria-label={tr(language, "common.close")}>✕</button>
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
                            <span className="search-type">{result.type}</span>
                            <span>{result.text}</span>
                            {result.week && <span className="muted">{tr(language, "app.headerWeekShort", { week: result.week })}</span>}
                            {result.date && <span className="muted">{formatDate(result.date, dateFormat, language)}</span>}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
