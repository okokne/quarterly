import { useEffect, useState } from "react";
import { Book, AppLanguage } from "../../types";
import { t as tr } from "../../i18n";
import { formatDate } from "../../utils";
import { getBookProgressPercent, sanitizeBookCategories, sortBookSessionsByDateDesc } from "../../utils/books";

type BookSessionModalProps = {
    open: boolean;
    language: AppLanguage;
    book: Book | null;
    onClose: () => void;
    onSave: (bookId: string, pagesRead: number, notes?: string) => void;
    onUpdateBook: (id: string, updates: Partial<Book>) => void;
    onDeleteBook: (id: string) => void;
};

export function BookSessionModal({
    open,
    language,
    book,
    onClose,
    onSave,
    onUpdateBook,
    onDeleteBook
}: BookSessionModalProps) {
    const [pagesRead, setPagesRead] = useState("");
    const [notes, setNotes] = useState("");
    const [editing, setEditing] = useState(false);
    const [editTitle, setEditTitle] = useState("");
    const [editAuthor, setEditAuthor] = useState("");
    const [editTotalPages, setEditTotalPages] = useState("");
    const [editCategories, setEditCategories] = useState("");

    useEffect(() => {
        if (!open || !book) return;
        setPagesRead("");
        setNotes("");
        setEditing(false);
        setEditTitle(book.title);
        setEditAuthor(book.author ?? "");
        setEditTotalPages(book.totalPages > 0 ? String(book.totalPages) : "");
        setEditCategories((book.categories ?? []).join(", "));
    }, [open, book?.id]);

    if (!open || !book) return null;

    const parsedPages = Math.max(0, parseInt(pagesRead, 10) || 0);
    const nextTotalPages = book.totalPages > 0
        ? Math.min(book.readPages + parsedPages, book.totalPages)
        : book.readPages + parsedPages;
    const previewTotal = book.totalPages > 0 ? book.totalPages : "?";
    const previewPercent = getBookProgressPercent({
        readPages: nextTotalPages,
        totalPages: book.totalPages
    });
    const sortedSessions = sortBookSessionsByDateDesc(book.sessions ?? []);
    const isQueueBook = book.status !== "finished" && book.readPages === 0;

    const handleSaveSession = () => {
        if (parsedPages <= 0) return;
        onSave(book.id, nextTotalPages, notes.trim() || undefined);
        setPagesRead("");
        setNotes("");
    };

    const handleSaveMeta = () => {
        if (!editTitle.trim()) return;
        const parsedTotal = Math.max(0, parseInt(editTotalPages, 10) || 0);
        onUpdateBook(book.id, {
            title: editTitle.trim(),
            author: editAuthor.trim() || undefined,
            totalPages: parsedTotal,
            categories: sanitizeBookCategories(editCategories.split(","))
        });
        setEditing(false);
    };

    return (
        <div className="modal-backdrop z-max">
            <div className="modal panel-content glass-panel">
                <div className="modal-header pb-4 pt-2">
                    <h3 className="m-0 text-xl font-bold">{book.title}</h3>
                    <p className="text-secondary mt-2 mb-0">
                        {isQueueBook
                            ? tr(language, "books.queue")
                            : tr(language, `books.status.${book.status}`)}
                    </p>
                </div>

                <div className="mb-4">
                    <p className="text-secondary text-sm mb-1">
                        {book.readPages} / {book.totalPages || "?"} {tr(language, "books.readPages")}
                    </p>
                    {!isQueueBook && book.totalPages > 0 && (
                        <div className="book-progress-bar-container">
                            <div className="book-progress-fill aura-fill" style={{ width: `${getBookProgressPercent(book)}%` }} />
                        </div>
                    )}
                </div>

                <div className="books-detail-actions-row">
                    <button type="button" className="glass-button" onClick={() => setEditing((prev) => !prev)}>
                        {editing ? tr(language, "common.close") : tr(language, "books.editInline")}
                    </button>
                </div>

                {editing && (
                    <div className="books-inline-edit glass-panel panel-content mt-3">
                        <div className="grid md:grid-cols-2 gap-3">
                            <input
                                type="text"
                                className="glass-input"
                                value={editTitle}
                                onChange={(event) => setEditTitle(event.target.value)}
                                placeholder={tr(language, "books.bookTitle")}
                            />
                            <input
                                type="text"
                                className="glass-input"
                                value={editAuthor}
                                onChange={(event) => setEditAuthor(event.target.value)}
                                placeholder={tr(language, "books.bookAuthor")}
                            />
                            <input
                                type="number"
                                className="glass-input"
                                value={editTotalPages}
                                min="0"
                                onChange={(event) => setEditTotalPages(event.target.value)}
                                placeholder={tr(language, "books.totalPages")}
                            />
                            <input
                                type="text"
                                className="glass-input"
                                value={editCategories}
                                onChange={(event) => setEditCategories(event.target.value)}
                                placeholder={tr(language, "books.categoriesPlaceholder")}
                            />
                        </div>
                        <div className="mt-3">
                            <button type="button" className="glass-button primary-action" onClick={handleSaveMeta} disabled={!editTitle.trim()}>
                                {tr(language, "books.saveDetails")}
                            </button>
                        </div>
                    </div>
                )}

                {book.status !== "finished" && (
                    <form
                        className="mt-5"
                        onSubmit={(event) => {
                            event.preventDefault();
                            handleSaveSession();
                        }}
                    >
                        <div className="form-group">
                            <label className="text-secondary">{tr(language, "books.sessionPagesLabel")}</label>
                            <input
                                type="number"
                                className="glass-input w-full mt-2"
                                value={pagesRead}
                                onChange={(event) => setPagesRead(event.target.value)}
                                placeholder="15"
                                min="1"
                                autoFocus={!editing}
                            />
                            <div className="books-session-quick-actions">
                                {[10, 25, 50].map((value) => (
                                    <button
                                        key={value}
                                        type="button"
                                        className="chip chip-outline"
                                        onClick={() => {
                                            setPagesRead((previous) => String((parseInt(previous, 10) || 0) + value));
                                        }}
                                    >
                                        +{value}
                                    </button>
                                ))}
                            </div>
                            <p className="text-secondary text-sm mt-2 mb-0">
                                {tr(language, "books.sessionPreview", {
                                    pages: nextTotalPages,
                                    total: previewTotal,
                                    percent: previewPercent
                                })}
                            </p>
                        </div>

                        <div className="form-group mt-4">
                            <label className="text-secondary">{tr(language, "books.sessionNotes")}</label>
                            <textarea
                                className="glass-input w-full mt-2 resize-none h-24"
                                value={notes}
                                onChange={(event) => setNotes(event.target.value)}
                                placeholder={tr(language, "books.notesPlaceholder")}
                            />
                        </div>

                        <div className="modal-actions mt-6 flex justify-end gap-2">
                            <button type="submit" className="glass-button primary-action px-6 py-2" disabled={parsedPages <= 0}>
                                {tr(language, "books.saveSession")}
                            </button>
                        </div>
                    </form>
                )}

                <div className="mt-8">
                    <h4 className="font-medium mb-2 text-secondary text-sm">{tr(language, "books.sessionsHistory")}</h4>
                    {sortedSessions.length === 0 ? (
                        <p className="text-secondary text-sm">{tr(language, "books.noSessions")}</p>
                    ) : (
                        <div className="space-y-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                            {sortedSessions.map((session) => (
                                <div key={session.id} className="book-session-item glass-panel p-3 text-sm">
                                    <div className="flex justify-between text-secondary mb-1">
                                        <span>{formatDate(session.date.split("T")[0], "iso", language)}</span>
                                        <span>{tr(language, "books.sessionPageLabel", { page: session.pagesRead })}</span>
                                    </div>
                                    {session.notes && <p className="mt-1">{session.notes}</p>}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="books-detail-footer mt-8">
                    <button type="button" className="glass-button" onClick={onClose}>
                        {tr(language, "common.close")}
                    </button>
                    {book.status !== "finished" ? (
                        <button
                            type="button"
                            className="glass-button"
                            onClick={() => onUpdateBook(book.id, { status: "finished" })}
                        >
                            {tr(language, "books.markFinished")}
                        </button>
                    ) : (
                        <button
                            type="button"
                            className="glass-button"
                            onClick={() => onUpdateBook(book.id, { status: "reading" })}
                        >
                            {tr(language, "books.reopenBook")}
                        </button>
                    )}
                    <button
                        type="button"
                        className="glass-button text-red-500"
                        onClick={() => {
                            if (window.confirm(tr(language, "books.deleteConfirm"))) {
                                onDeleteBook(book.id);
                                onClose();
                            }
                        }}
                    >
                        {tr(language, "common.delete")}
                    </button>
                </div>
            </div>
        </div>
    );
}
