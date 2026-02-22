import { FormEvent, useEffect, useMemo, useState } from "react";
import { AppLanguage, Book, BookStatus } from "../../types";
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

type SessionRow = {
    id: string;
    date: string;
    pages: number;
    fromPage: number;
    toPage: number;
    durationMinutes?: number;
    notes?: string;
};

function toPositiveInt(value: number | undefined): number {
    if (typeof value !== "number" || Number.isNaN(value)) return 0;
    return Math.max(0, Math.floor(value));
}

export function BookSessionModal({
    open,
    language,
    book,
    onClose,
    onSave,
    onUpdateBook,
    onDeleteBook
}: BookSessionModalProps) {
    const statusOptions: BookStatus[] = ["want_to_read", "reading", "finished"];
    const [pagesInput, setPagesInput] = useState("");
    const [durationInput, setDurationInput] = useState("");
    const [sessionNote, setSessionNote] = useState("");
    const [showHistory, setShowHistory] = useState(true);

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

    const sessionRows = useMemo(() => {
        let previousPage = 0;
        return sortedSessions
            .map<SessionRow | null>((session) => {
                const rawPages = toPositiveInt(session.pagesRead);
                const pageAfterCandidate = toPositiveInt(session.pageAfter);

                let pageAfter = previousPage;
                if (pageAfterCandidate > 0) {
                    pageAfter = Math.max(previousPage, pageAfterCandidate);
                } else if (rawPages >= previousPage) {
                    // Legacy cumulative logs.
                    pageAfter = Math.max(previousPage, rawPages);
                } else {
                    // New additive logs.
                    pageAfter = previousPage + rawPages;
                }

                const pages = Math.max(0, pageAfter - previousPage);
                if (pages <= 0) return null;

                const row: SessionRow = {
                    id: session.id,
                    date: session.date,
                    pages,
                    fromPage: previousPage,
                    toPage: pageAfter,
                    durationMinutes: session.durationMinutes,
                    notes: session.notes
                };
                previousPage = pageAfter;
                return row;
            })
            .filter((entry): entry is SessionRow => entry !== null);
    }, [sortedSessions]);

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
    const canMarkFinished = isReading && book.totalPages > 0 && book.readPages >= book.totalPages;
    const canSetFinishedStatus = book.status === "finished" || book.totalPages <= 0 || book.readPages >= book.totalPages;

    const setParsedPages = (nextValue: number) => {
        const normalized = Math.max(0, Math.floor(nextValue));
        setPagesInput(normalized > 0 ? String(normalized) : "");
    };

    const setParsedDuration = (nextValue: number) => {
        const normalized = Math.max(0, Math.floor(nextValue));
        setDurationInput(normalized > 0 ? String(normalized) : "");
    };

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!isReading || parsedPages <= 0) return;
        onSave(
            book.id,
            parsedPages,
            parsedDuration > 0 ? parsedDuration : undefined,
            sessionNote.trim() || undefined
        );
        setPagesInput("");
        setDurationInput("");
        setSessionNote("");
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

                <div className="books-status-editor">
                    <p className="books-status-editor-label">{tr(language, "books.statusLabel")}</p>
                    <div className="books-status-chip-row">
                        {statusOptions.map((status) => {
                            const disabled = status === "finished" && !canSetFinishedStatus;
                            return (
                                <button
                                    key={status}
                                    type="button"
                                    className={`books-status-chip ${book.status === status ? "active" : ""}`}
                                    disabled={disabled}
                                    onClick={() => onUpdateBook(book.id, { status })}
                                >
                                    {tr(language, `books.status.${status}`)}
                                </button>
                            );
                        })}
                    </div>
                    {!canSetFinishedStatus && (
                        <p className="books-status-editor-hint">{tr(language, "books.finishLockedHint")}</p>
                    )}
                </div>

                {isReading ? (
                    <form className="books-session-form" onSubmit={handleSubmit}>
                        <label className="books-session-label">
                            {tr(language, "books.sessionPagesLabel")}
                            <div className="books-session-pages-row">
                                <button type="button" className="book-page-step-btn" onClick={() => setParsedPages(parsedPages - 1)}>-</button>
                                <input
                                    type="number"
                                    className="glass-input"
                                    value={pagesInput}
                                    min="1"
                                    step="1"
                                    autoFocus
                                    onChange={(event) => setPagesInput(event.target.value)}
                                />
                                <button type="button" className="book-page-step-btn" onClick={() => setParsedPages(parsedPages + 1)}>+</button>
                            </div>
                        </label>

                        <div className="books-session-chip-row">
                            {([-20, -10, -5, 5, 10, 20] as const).map((delta) => (
                                <button
                                    key={delta}
                                    type="button"
                                    className="books-session-chip-btn"
                                    onClick={() => setParsedPages(parsedPages + delta)}
                                >
                                    {delta > 0 ? `+${delta}` : String(delta)}
                                </button>
                            ))}
                        </div>

                        <label className="books-session-label">
                            {tr(language, "books.sessionDurationOptional")}
                            <div className="books-session-pages-row">
                                <button type="button" className="book-page-step-btn" onClick={() => setParsedDuration(parsedDuration - 1)}>-</button>
                                <input
                                    type="number"
                                    className="glass-input"
                                    value={durationInput}
                                    min="1"
                                    step="1"
                                    onChange={(event) => setDurationInput(event.target.value)}
                                />
                                <button type="button" className="book-page-step-btn" onClick={() => setParsedDuration(parsedDuration + 1)}>+</button>
                            </div>
                        </label>

                        <div className="books-session-chip-row">
                            {([-20, -10, -5, 5, 10, 20] as const).map((delta) => (
                                <button
                                    key={`duration-${delta}`}
                                    type="button"
                                    className="books-session-chip-btn"
                                    onClick={() => setParsedDuration(parsedDuration + delta)}
                                >
                                    {delta > 0 ? `+${delta}` : String(delta)}
                                </button>
                            ))}
                        </div>

                        <label className="books-session-label">
                            {tr(language, "books.sessionThoughtsOptional")}
                            <textarea
                                className="glass-input w-full resize-none books-session-note-input"
                                value={sessionNote}
                                maxLength={220}
                                onChange={(event) => setSessionNote(event.target.value)}
                            />
                        </label>

                        {parsedPages > 0 && (
                            <p className="text-secondary text-xs mt-1 mb-0">
                                {tr(language, "books.sessionPreview", {
                                    pages: previewPages,
                                    total: book.totalPages || "?",
                                    percent: previewPercent
                                })}
                            </p>
                        )}

                        <div className="books-session-actions">
                            <button type="submit" className="glass-button primary-action" disabled={parsedPages <= 0}>
                                {tr(language, "books.saveSession")}
                            </button>
                            {canMarkFinished && (
                                <button
                                    type="button"
                                    className="glass-button"
                                    onClick={() => onUpdateBook(book.id, { status: "finished" })}
                                >
                                    {tr(language, "books.markFinished")}
                                </button>
                            )}
                        </div>
                    </form>
                ) : null}

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
                        sessionRows.length === 0 ? (
                            <p className="text-secondary text-sm mt-2 mb-0">{tr(language, "books.noSessions")}</p>
                        ) : (
                            <div className="books-session-list">
                                {sessionRows.map((session) => (
                                    <article key={session.id} className="book-session-item glass-panel">
                                        <div className="book-session-item-head">
                                            <span>{formatDate(session.date.split("T")[0], "iso", language)}</span>
                                            <span>{tr(language, "books.sessionPagesCount", { value: session.pages })}</span>
                                        </div>
                                        <p className="text-secondary text-xs mt-1 mb-0">
                                            {tr(language, "books.sessionRangeLabel", {
                                                from: session.fromPage,
                                                to: session.toPage
                                            })}
                                        </p>
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

                <div className="books-detail-footer books-detail-footer-delete-only">
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
