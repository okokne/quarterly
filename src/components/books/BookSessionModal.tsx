import { FormEvent, useEffect, useMemo, useState } from "react";
import { AppLanguage, Book } from "../../types";
import { t as tr } from "../../i18n";
import { formatDate } from "../../utils";
import { getBookProgressPercent, sortBookSessionsByDateAsc } from "../../utils/books";

type BookSessionModalProps = {
    open: boolean;
    language: AppLanguage;
    book: Book | null;
    onClose: () => void;
    onSave: (bookId: string, pagesRead: number, durationMinutes?: number, notes?: string) => void;
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
    const [pagesInput, setPagesInput] = useState("");
    const [durationInput, setDurationInput] = useState("");
    const [sessionNote, setSessionNote] = useState("");
    const [showHistory, setShowHistory] = useState(true);
    const [showNotes, setShowNotes] = useState(true);

    useEffect(() => {
        if (!open || !book) return;
        setPagesInput("");
        setDurationInput("");
        setSessionNote("");
    }, [open, book?.id]);

    useEffect(() => {
        if (!open) return;
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handleEscape);
        return () => window.removeEventListener("keydown", handleEscape);
    }, [open, onClose]);

    const sortedSessions = useMemo(
        () => sortBookSessionsByDateAsc(book?.sessions ?? []),
        [book?.sessions]
    );
    const notedSessions = useMemo(
        () => sortedSessions.filter((session) => Boolean(session.notes)),
        [sortedSessions]
    );

    if (!open || !book) return null;

    const isReading = book.status === "reading";
    const progressPercent = getBookProgressPercent(book);
    const parsedPages = Math.max(0, Math.floor(Number(pagesInput) || 0));
    const parsedDuration = Math.max(0, Math.floor(Number(durationInput) || 0));
    const previewPages = book.totalPages > 0
        ? Math.min(book.readPages + parsedPages, book.totalPages)
        : (book.readPages + parsedPages);
    const previewPercent = book.totalPages > 0
        ? Math.min(100, Math.round((previewPages / book.totalPages) * 100))
        : 0;

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!isReading || parsedPages <= 0) return;
        onSave(
            book.id,
            parsedPages,
            parsedDuration > 0 ? parsedDuration : undefined,
            sessionNote.trim() || undefined
        );
        onClose();
    };

    return (
        <div className="modal-backdrop z-max" onClick={onClose}>
            <div className="modal panel-content glass-panel books-modal-shell" onClick={(event) => event.stopPropagation()}>
                <div className="modal-header books-modal-header">
                    <h3 className="m-0 text-xl font-bold">{book.title}</h3>
                    <p className="text-secondary mt-2 mb-0">{tr(language, `books.status.${book.status}`)}</p>
                </div>

                <div className="books-detail-top">
                    <p className="text-secondary text-sm mb-2">
                        {book.readPages}/{book.totalPages || "?"} {tr(language, "books.readPages")}
                    </p>
                    {book.totalPages > 0 && (
                        <>
                            <div className="book-progress-bar-container">
                                <div className="book-progress-fill aura-fill" style={{ width: `${progressPercent}%` }} />
                            </div>
                            <p className="text-secondary text-xs mt-2 mb-0">{progressPercent}%</p>
                        </>
                    )}
                </div>

                {isReading ? (
                    <form className="books-session-form" onSubmit={handleSubmit}>
                        <div className="books-session-pages-row">
                            <input
                                type="number"
                                className="glass-input"
                                value={pagesInput}
                                min="1"
                                step="1"
                                autoFocus
                                onChange={(event) => setPagesInput(event.target.value)}
                                placeholder={tr(language, "books.sessionPagesLabel")}
                            />
                            <button
                                type="button"
                                className="book-quick-btn"
                                onClick={() => {
                                    const next = parsedPages + 10;
                                    setPagesInput(String(next));
                                }}
                            >
                                +10
                            </button>
                        </div>

                        <input
                            type="number"
                            className="glass-input mt-3"
                            value={durationInput}
                            min="1"
                            step="1"
                            onChange={(event) => setDurationInput(event.target.value)}
                            placeholder={tr(language, "books.sessionDurationOptional")}
                        />

                        <textarea
                            className="glass-input w-full mt-3 resize-none books-session-note-input"
                            value={sessionNote}
                            maxLength={220}
                            onChange={(event) => setSessionNote(event.target.value)}
                            placeholder={tr(language, "books.sessionThoughtsOptional")}
                        />

                        {parsedPages > 0 && (
                            <p className="text-secondary text-xs mt-2 mb-0">
                                {tr(language, "books.sessionPreview", {
                                    pages: previewPages,
                                    total: book.totalPages || "?",
                                    percent: previewPercent
                                })}
                            </p>
                        )}

                        <div className="books-detail-footer mt-4">
                            <button type="button" className="glass-button" onClick={onClose}>
                                {tr(language, "common.close")}
                            </button>
                            <button type="submit" className="glass-button primary-action" disabled={parsedPages <= 0}>
                                {tr(language, "books.saveSession")}
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="books-detail-footer mt-2">
                        {book.status === "want_to_read" && (
                            <button
                                type="button"
                                className="glass-button primary-action"
                                onClick={() => onUpdateBook(book.id, { status: "reading" })}
                            >
                                {tr(language, "books.startReading")}
                            </button>
                        )}
                        <button type="button" className="glass-button" onClick={onClose}>
                            {tr(language, "common.close")}
                        </button>
                    </div>
                )}

                <section className="books-session-section">
                    <button
                        type="button"
                        className="books-session-toggle"
                        onClick={() => setShowHistory((prev) => !prev)}
                        aria-expanded={showHistory}
                    >
                        <span>{tr(language, "books.sessionsHistory")}</span>
                        <span>{showHistory ? "-" : "+"}</span>
                    </button>

                    {showHistory && (
                        sortedSessions.length === 0 ? (
                            <p className="text-secondary text-sm mt-2 mb-0">{tr(language, "books.noSessions")}</p>
                        ) : (
                            <div className="books-session-list">
                                {sortedSessions.map((session) => (
                                    <article key={session.id} className="book-session-item glass-panel">
                                        <div className="book-session-item-head">
                                            <span>{formatDate(session.date.split("T")[0], "iso", language)}</span>
                                            <span>{tr(language, "books.sessionPagesCount", { value: session.pagesRead })}</span>
                                        </div>
                                        {session.durationMinutes && (
                                            <p className="text-secondary text-xs mt-1 mb-0">
                                                {tr(language, "books.sessionDurationShort", { value: session.durationMinutes })}
                                            </p>
                                        )}
                                        {session.notes && <p className="mt-2 mb-0">{session.notes}</p>}
                                    </article>
                                ))}
                            </div>
                        )
                    )}
                </section>

                <section className="books-session-section">
                    <button
                        type="button"
                        className="books-session-toggle"
                        onClick={() => setShowNotes((prev) => !prev)}
                        aria-expanded={showNotes}
                    >
                        <span>{tr(language, "books.notesArchive")}</span>
                        <span>{showNotes ? "-" : "+"}</span>
                    </button>

                    {showNotes && (
                        notedSessions.length === 0 ? (
                            <p className="text-secondary text-sm mt-2 mb-0">{tr(language, "books.noSessionNotes")}</p>
                        ) : (
                            <div className="books-notes-archive">
                                {notedSessions.map((session) => (
                                    <article key={session.id} className="books-note-item">
                                        <p className="books-note-date">
                                            {formatDate(session.date.split("T")[0], "iso", language)}
                                        </p>
                                        <p className="books-note-text">{session.notes}</p>
                                    </article>
                                ))}
                            </div>
                        )
                    )}
                </section>

                <div className="books-detail-footer">
                    <button type="button" className="glass-button" onClick={onClose}>
                        {tr(language, "common.close")}
                    </button>
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
