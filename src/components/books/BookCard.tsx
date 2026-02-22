import { AppLanguage, Book } from "../../types";
import { t as tr } from "../../i18n";
import { getBookProgressPercent } from "../../utils/books";

type BookCardProps = {
    book: Book;
    language: AppLanguage;
    onOpenDetails: () => void;
    queuePosition?: number;
    queueTotal?: number;
    onMoveQueueUp?: () => void;
    onMoveQueueDown?: () => void;
};

export function BookCard({
    book,
    language,
    onOpenDetails,
    queuePosition,
    queueTotal,
    onMoveQueueUp,
    onMoveQueueDown
}: BookCardProps) {
    const progressPercent = getBookProgressPercent(book);
    const isQueueBook = book.status !== "finished" && book.readPages === 0;
    const statusLabel = isQueueBook
        ? tr(language, "books.queue")
        : tr(language, `books.status.${book.status}`);

    return (
        <article
            className={`book-card compact ${isQueueBook ? "queue" : ""}`}
            role="button"
            tabIndex={0}
            onClick={onOpenDetails}
            onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onOpenDetails();
                }
            }}
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

                    <div className="book-card-side">
                        <div className={`book-status-pill status-${book.status}`}>{statusLabel}</div>
                        {typeof queuePosition === "number" && typeof queueTotal === "number" && (
                            <div className="book-queue-controls" onClick={(event) => event.stopPropagation()}>
                                <button
                                    type="button"
                                    className="book-queue-button"
                                    onClick={onMoveQueueUp}
                                    disabled={!onMoveQueueUp}
                                    title={tr(language, "books.queueMoveUp")}
                                >
                                    ↑
                                </button>
                                <span>{tr(language, "books.queuePosition", { position: queuePosition, total: queueTotal })}</span>
                                <button
                                    type="button"
                                    className="book-queue-button"
                                    onClick={onMoveQueueDown}
                                    disabled={!onMoveQueueDown}
                                    title={tr(language, "books.queueMoveDown")}
                                >
                                    ↓
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {!isQueueBook && book.totalPages > 0 && (
                    <div className="book-progress-section compact">
                        <div className="book-progress-bar-container">
                            <div className="book-progress-fill aura-fill" style={{ width: `${progressPercent}%` }} />
                        </div>
                    </div>
                )}
            </div>
        </article>
    );
}
