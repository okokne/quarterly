import { CheckSquare, CircleStop, Trash2 } from "../ui/icons";
import { Book, AppLanguage } from "../../types";
import { t as tr } from "../../i18n";
import { useConfirmModalsProps } from "../../hooks/useConfirmModalsProps";

type BookCardProps = {
    book: Book;
    language: AppLanguage;
    onEdit: (book: Book) => void;
    onDelete: (id: string) => void;
    onAddSession: (book: Book) => void;
};

export function BookCard({ book, language, onEdit, onDelete, onAddSession }: BookCardProps) {
    const progressPercent = book.totalPages > 0 ? Math.min(100, Math.round((book.readPages / book.totalPages) * 100)) : 0;

    return (
        <div className="book-card interactable" onClick={() => onEdit(book)}>
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
                    <h3 className="book-card-title">{book.title}</h3>
                    {book.author && <p className="book-card-author">{book.author}</p>}
                </div>

                <div className="book-categories">
                    {book.categories.map((cat, i) => (
                        <span key={i} className="chip chip-outline">{cat}</span>
                    ))}
                </div>

                {book.status === "reading" && (
                    <div className="book-progress-section">
                        <div className="book-progress-header">
                            <span className="book-progress-text">{book.readPages} / {book.totalPages} {tr(language, "books.pages_read")}</span>
                            <span className="book-progress-percent">{progressPercent}%</span>
                        </div>
                        <div className="book-progress-bar-container">
                            <div className="book-progress-fill aura-fill" style={{ width: `${progressPercent}%` }} />
                        </div>
                    </div>
                )}

                <div className="book-card-actions" onClick={e => e.stopPropagation()}>
                    <button
                        className="icon-button glass-button"
                        onClick={() => onAddSession(book)}
                        title={tr(language, "books.add_session")}
                    >
                        {book.status === "finished" ? <CheckSquare size={16} /> : <CircleStop size={16} />}
                    </button>
                    <button
                        className="icon-button glass-button text-red-500"
                        onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm("Derzeitiges Buch löschen?")) {
                                onDelete(book.id);
                            }
                        }}
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
}
