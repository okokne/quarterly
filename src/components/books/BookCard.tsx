import { CheckSquare, CircleStop, Pencil, Trash2 } from "../ui/icons";
import { Book, AppLanguage } from "../../types";
import { t as tr } from "../../i18n";
import { getBookProgressPercent } from "../../utils/books";

type BookCardProps = {
    book: Book;
    language: AppLanguage;
    onEdit: () => void;
    onDelete: (id: string) => void;
    onAddSession: () => void;
    onUpdateStatus: (status: Book["status"]) => void;
};

export function BookCard({ book, language, onEdit, onDelete, onAddSession, onUpdateStatus }: BookCardProps) {
    const progressPercent = getBookProgressPercent(book);
    const statusLabel = tr(language, `books.status.${book.status}`);
    const quickStatusAction = book.status === "finished"
        ? {
            label: tr(language, "books.restart"),
            icon: CircleStop,
            nextStatus: "reading" as const
        }
        : book.status === "reading"
            ? {
                label: tr(language, "books.markFinished"),
                icon: CheckSquare,
                nextStatus: "finished" as const
            }
            : {
                label: tr(language, "books.startReading"),
                icon: CircleStop,
                nextStatus: "reading" as const
            };
    const QuickStatusIcon = quickStatusAction.icon;

    return (
        <article className="book-card">
            <div className="book-card-cover-container">
                {book.coverUrl ? (
                    <img src={book.coverUrl} alt={book.title} className="book-cover-image" />
                ) : (
                    <div className="book-cover-placeholder">
                        <span>{book.title.charAt(0).toUpperCase()}</span>
                    </div>
                )}
            </div>

            <div className="book-card-content">
                <div className="book-card-header">
                    <div className={`book-status-pill status-${book.status}`}>{statusLabel}</div>
                    <h3 className="book-card-title">{book.title}</h3>
                    {book.author && <p className="book-card-author">{book.author}</p>}
                </div>

                {book.categories.length > 0 && (
                    <div className="book-categories">
                        {book.categories.map((cat, i) => (
                            <span key={i} className="chip chip-outline">{cat}</span>
                        ))}
                    </div>
                )}

                {(book.status === "reading" || book.status === "finished") && book.totalPages > 0 && (
                    <div className="book-progress-section">
                        <div className="book-progress-header">
                            <span className="book-progress-text">{book.readPages} / {book.totalPages} {tr(language, "books.readPages")}</span>
                            <span className="book-progress-percent">{progressPercent}%</span>
                        </div>
                        <div className="book-progress-bar-container">
                            <div className="book-progress-fill aura-fill" style={{ width: `${progressPercent}%` }} />
                        </div>
                    </div>
                )}

                <div className="book-card-actions">
                    <button
                        type="button"
                        className="book-action-button primary"
                        onClick={onAddSession}
                    >
                        <CircleStop size={16} />
                        {tr(language, "books.addSession")}
                    </button>
                    <button
                        type="button"
                        className="book-action-button"
                        onClick={() => onUpdateStatus(quickStatusAction.nextStatus)}
                    >
                        <QuickStatusIcon size={16} />
                        {quickStatusAction.label}
                    </button>
                    <button
                        type="button"
                        className="book-action-button"
                        onClick={onEdit}
                    >
                        <Pencil size={16} />
                        {tr(language, "common.edit")}
                    </button>
                    <button
                        type="button"
                        className="book-action-button danger"
                        onClick={() => {
                            if (window.confirm(tr(language, "books.deleteConfirm"))) {
                                onDelete(book.id);
                            }
                        }}
                    >
                        <Trash2 size={16} />
                        {tr(language, "common.delete")}
                    </button>
                </div>
            </div>
        </article>
    );
}
