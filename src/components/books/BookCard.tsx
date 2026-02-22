import { KeyboardEvent } from "react";
import { AppLanguage, Book } from "../../types";
import { t as tr } from "../../i18n";
import { getBookProgressPercent } from "../../utils/books";

type BookCardProps = {
    book: Book;
    language: AppLanguage;
    onOpenDetails: () => void;
    onLogSession?: () => void;
    onQuickAddTen?: () => void;
    onStartReading?: () => void;
    queuePosition?: number;
    queueTotal?: number;
    onMoveQueueUp?: () => void;
    onMoveQueueDown?: () => void;
};

export function BookCard({
    book,
    language,
    onOpenDetails,
    onLogSession,
    onQuickAddTen,
    onStartReading,
    queuePosition,
    queueTotal,
    onMoveQueueUp,
    onMoveQueueDown
}: BookCardProps) {
    const progressPercent = getBookProgressPercent(book);

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
                        <button
                            type="button"
                            className="book-session-log-btn"
                            onClick={() => {
                                if (onLogSession) {
                                    onLogSession();
                                    return;
                                }
                                onOpenDetails();
                            }}
                        >
                            {tr(language, "books.addSession")}
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
                            onClick={() => {
                                onStartReading();
                                onOpenDetails();
                            }}
                        >
                            {tr(language, "books.startReading")}
                        </button>
                        {typeof queuePosition === "number" && typeof queueTotal === "number" && (
                            <div className="book-queue-inline">
                                <button
                                    type="button"
                                    className="book-queue-inline-btn"
                                    onClick={onMoveQueueUp}
                                    disabled={!onMoveQueueUp}
                                    title={tr(language, "books.queueMoveUp")}
                                >
                                    ↑
                                </button>
                                <span>{tr(language, "books.queuePosition", { position: queuePosition, total: queueTotal })}</span>
                                <button
                                    type="button"
                                    className="book-queue-inline-btn"
                                    onClick={onMoveQueueDown}
                                    disabled={!onMoveQueueDown}
                                    title={tr(language, "books.queueMoveDown")}
                                >
                                    ↓
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </article>
    );
}
