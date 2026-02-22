import { KeyboardEvent, useEffect, useState } from "react";
import { AppLanguage, Book } from "../../types";
import { t as tr } from "../../i18n";
import { getBookProgressPercent } from "../../utils/books";

type BookCardProps = {
    book: Book;
    language: AppLanguage;
    onOpenDetails: () => void;
    onQuickSetPage?: (page: number) => void;
    onQuickAddTen?: () => void;
    onStartReading?: () => void;
};

export function BookCard({
    book,
    language,
    onOpenDetails,
    onQuickSetPage,
    onQuickAddTen,
    onStartReading
}: BookCardProps) {
    const progressPercent = getBookProgressPercent(book);
    const [pageInput, setPageInput] = useState(String(book.readPages));

    useEffect(() => {
        setPageInput(String(book.readPages));
    }, [book.readPages, book.id]);

    const commitQuickUpdate = () => {
        if (!onQuickSetPage) return;
        const parsed = Math.floor(Number(pageInput));
        if (!Number.isFinite(parsed)) return;
        onQuickSetPage(parsed);
    };

    const onCardKeyDown = (event: KeyboardEvent<HTMLElement>) => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onOpenDetails();
        }
    };

    return (
        <article
            className={`book-card compact status-${book.status}`}
            role="button"
            tabIndex={0}
            onClick={onOpenDetails}
            onKeyDown={onCardKeyDown}
            aria-label={tr(language, "books.openDetails")}
        >
            <div className="book-card-cover-container compact">
                {book.coverUrl ? (
                    <img src={book.coverUrl} alt={book.title} className="book-cover-image" />
                ) : (
                    <div className="book-cover-placeholder">
                        <span>{book.title.charAt(0).toUpperCase()}</span>
                    </div>
                )}
            </div>

            <div className="book-card-content compact">
                <div className="book-card-row">
                    <div className="book-card-main">
                        <h3 className="book-card-title">{book.title}</h3>
                        {book.author && <p className="book-card-author">{book.author}</p>}
                        <p className="book-card-meta">
                            {book.totalPages > 0
                                ? `${book.readPages}/${book.totalPages} ${tr(language, "books.readPages")}`
                                : tr(language, "books.totalPagesUnknown")}
                        </p>
                    </div>

                    <div className={`book-status-pill status-${book.status}`}>
                        {tr(language, `books.status.${book.status}`)}
                    </div>
                </div>

                {book.status === "reading" && book.totalPages > 0 && (
                    <div className="book-progress-section compact">
                        <div className="book-progress-header compact">
                            <span>{progressPercent}%</span>
                            <span>{tr(language, "books.quickUpdate")}</span>
                        </div>
                        <div className="book-progress-bar-container">
                            <div className="book-progress-fill aura-fill" style={{ width: `${progressPercent}%` }} />
                        </div>
                    </div>
                )}

                {book.status === "reading" && (
                    <div className="book-quick-controls" onClick={(event) => event.stopPropagation()}>
                        <input
                            type="number"
                            className="glass-input book-quick-input"
                            value={pageInput}
                            min={book.readPages}
                            max={book.totalPages > 0 ? book.totalPages : undefined}
                            onChange={(event) => setPageInput(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    commitQuickUpdate();
                                }
                            }}
                        />
                        <button
                            type="button"
                            className="book-quick-btn"
                            onClick={commitQuickUpdate}
                        >
                            {tr(language, "books.saveProgress")}
                        </button>
                        {onQuickAddTen && (
                            <button
                                type="button"
                                className="book-quick-btn"
                                onClick={onQuickAddTen}
                            >
                                +10
                            </button>
                        )}
                    </div>
                )}

                {book.status === "want_to_read" && onStartReading && (
                    <div className="book-quick-controls" onClick={(event) => event.stopPropagation()}>
                        <button
                            type="button"
                            className="book-quick-btn"
                            onClick={onStartReading}
                        >
                            {tr(language, "books.startReading")}
                        </button>
                    </div>
                )}
            </div>
        </article>
    );
}
