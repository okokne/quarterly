import { useEffect, useState } from "react";
import { Book, AppLanguage } from "../../types";
import { t as tr } from "../../i18n";
import { formatDate, toIsoDate } from "../../utils";
import { getBookCompletionStats, getBookProgressPercent, sortBookSessionsByDateDesc } from "../../utils/books";

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
    const [progressInput, setProgressInput] = useState("");
    const [sessionNote, setSessionNote] = useState("");
    const [showEdit, setShowEdit] = useState(false);
    const [showFinishPanel, setShowFinishPanel] = useState(false);
    const [completionNote, setCompletionNote] = useState("");
    const [editTitle, setEditTitle] = useState("");
    const [editAuthor, setEditAuthor] = useState("");
    const [editTotalPages, setEditTotalPages] = useState("");
    const [editCoverUrl, setEditCoverUrl] = useState("");

    useEffect(() => {
        if (!open || !book) return;
        setProgressInput(String(book.readPages));
        setSessionNote("");
        setShowEdit(false);
        setShowFinishPanel(false);
        setCompletionNote(book.completionNote ?? "");
        setEditTitle(book.title);
        setEditAuthor(book.author ?? "");
        setEditTotalPages(book.totalPages > 0 ? String(book.totalPages) : "");
        setEditCoverUrl(book.coverUrl ?? "");
    }, [open, book?.id]);

    if (!open || !book) return null;

    const sortedSessions = sortBookSessionsByDateDesc(book.sessions ?? []);
    const parsedProgress = Math.max(0, Math.floor(Number(progressInput) || 0));
    const nextProgress = book.totalPages > 0 ? Math.min(parsedProgress, book.totalPages) : parsedProgress;
    const percent = getBookProgressPercent(book);
    const completionStats = getBookCompletionStats({ ...book, finishDate: toIsoDate(new Date()) });

    const handleSaveProgress = () => {
        if (book.status !== "reading") return;
        if (nextProgress <= book.readPages) return;
        onSave(book.id, nextProgress, sessionNote.trim() || undefined);
        setSessionNote("");
    };

    const handleSaveMeta = () => {
        if (!editTitle.trim()) return;
        onUpdateBook(book.id, {
            title: editTitle.trim(),
            author: editAuthor.trim() || undefined,
            totalPages: Math.max(0, parseInt(editTotalPages, 10) || 0),
            coverUrl: editCoverUrl.trim() || undefined
        });
        setShowEdit(false);
    };

    const handleFinishBook = () => {
        onUpdateBook(book.id, {
            status: "finished",
            completionNote: completionNote.trim() || undefined
        });
        setShowFinishPanel(false);
    };

    return (
        <div className="modal-backdrop z-max">
            <div className="modal panel-content glass-panel">
                <div className="modal-header pb-4 pt-2">
                    <h3 className="m-0 text-xl font-bold">{book.title}</h3>
                    <p className="text-secondary mt-2 mb-0">{tr(language, `books.status.${book.status}`)}</p>
                </div>

                <div className="books-detail-top">
                    <p className="text-secondary text-sm mb-1">
                        {book.readPages}/{book.totalPages || "?"} {tr(language, "books.readPages")}
                    </p>
                    {book.status === "reading" && book.totalPages > 0 && (
                        <div className="book-progress-bar-container">
                            <div className="book-progress-fill aura-fill" style={{ width: `${percent}%` }} />
                        </div>
                    )}
                </div>

                <div className="books-detail-actions-row">
                    <button type="button" className="glass-button" onClick={() => setShowEdit((prev) => !prev)}>
                        {showEdit ? tr(language, "common.close") : tr(language, "books.editInline")}
                    </button>
                </div>

                {showEdit && (
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
                                type="url"
                                className="glass-input"
                                value={editCoverUrl}
                                onChange={(event) => setEditCoverUrl(event.target.value)}
                                placeholder={tr(language, "books.coverUrl")}
                            />
                        </div>
                        <div className="mt-3">
                            <button
                                type="button"
                                className="glass-button primary-action"
                                onClick={handleSaveMeta}
                                disabled={!editTitle.trim()}
                            >
                                {tr(language, "books.saveDetails")}
                            </button>
                        </div>
                    </div>
                )}

                {book.status === "want_to_read" && (
                    <div className="books-detail-cta mt-4">
                        <button
                            type="button"
                            className="glass-button primary-action"
                            onClick={() => onUpdateBook(book.id, { status: "reading" })}
                        >
                            {tr(language, "books.startReading")}
                        </button>
                    </div>
                )}

                {book.status === "reading" && (
                    <form
                        className="mt-5"
                        onSubmit={(event) => {
                            event.preventDefault();
                            handleSaveProgress();
                        }}
                    >
                        <div className="form-group">
                            <label className="text-secondary">{tr(language, "books.quickUpdate")}</label>
                            <div className="books-detail-quick-row">
                                <input
                                    type="number"
                                    className="glass-input"
                                    value={progressInput}
                                    onChange={(event) => setProgressInput(event.target.value)}
                                    min={book.readPages}
                                    max={book.totalPages > 0 ? book.totalPages : undefined}
                                />
                                <button
                                    type="button"
                                    className="glass-button"
                                    onClick={() => {
                                        const tenAhead = book.readPages + 10;
                                        const clamped = book.totalPages > 0 ? Math.min(tenAhead, book.totalPages) : tenAhead;
                                        setProgressInput(String(clamped));
                                        onSave(book.id, clamped);
                                    }}
                                >
                                    +10
                                </button>
                                <button type="submit" className="glass-button primary-action" disabled={nextProgress <= book.readPages}>
                                    {tr(language, "books.saveProgress")}
                                </button>
                            </div>
                        </div>

                        <div className="form-group mt-3">
                            <label className="text-secondary">{tr(language, "books.sessionNotesOptional")}</label>
                            <textarea
                                className="glass-input w-full mt-2 resize-none h-20"
                                value={sessionNote}
                                maxLength={180}
                                onChange={(event) => setSessionNote(event.target.value)}
                                placeholder={tr(language, "books.notesShortPlaceholder")}
                            />
                        </div>

                        {!showFinishPanel && (
                            <div className="books-detail-cta mt-4">
                                <button type="button" className="glass-button" onClick={() => setShowFinishPanel(true)}>
                                    {tr(language, "books.markFinished")}
                                </button>
                            </div>
                        )}
                    </form>
                )}

                {showFinishPanel && (
                    <div className="books-finish-panel glass-panel panel-content mt-4">
                        <h4 className="m-0 mb-2">{tr(language, "books.finishSummaryTitle")}</h4>
                        <div className="books-finish-stats">
                            <span>{tr(language, "books.finishTotalPages", { value: completionStats.totalPages })}</span>
                            <span>{tr(language, "books.finishDuration", { value: completionStats.readingDays })}</span>
                            <span>{tr(language, "books.finishAvgPages", { value: completionStats.pagesPerDay })}</span>
                        </div>
                        <label className="text-secondary mt-3 block">{tr(language, "books.completionNoteLabel")}</label>
                        <textarea
                            className="glass-input w-full mt-2 resize-none h-20"
                            value={completionNote}
                            maxLength={180}
                            onChange={(event) => setCompletionNote(event.target.value)}
                            placeholder={tr(language, "books.completionNotePlaceholder")}
                        />
                        <div className="books-finish-actions mt-3">
                            <button type="button" className="glass-button" onClick={() => setShowFinishPanel(false)}>
                                {tr(language, "common.back")}
                            </button>
                            <button type="button" className="glass-button primary-action" onClick={handleFinishBook}>
                                {tr(language, "books.confirmFinish")}
                            </button>
                        </div>
                    </div>
                )}

                {book.status === "finished" && (
                    <div className="books-finish-panel glass-panel panel-content mt-4">
                        <h4 className="m-0 mb-2">{tr(language, "books.finishSummaryTitle")}</h4>
                        <div className="books-finish-stats">
                            <span>{tr(language, "books.finishTotalPages", { value: completionStats.totalPages })}</span>
                            <span>{tr(language, "books.finishDuration", { value: completionStats.readingDays })}</span>
                            <span>{tr(language, "books.finishAvgPages", { value: completionStats.pagesPerDay })}</span>
                        </div>
                        {book.completionNote && <p className="text-secondary mt-3 mb-0">{book.completionNote}</p>}
                        <div className="books-detail-cta mt-3">
                            <button
                                type="button"
                                className="glass-button"
                                onClick={() => onUpdateBook(book.id, { status: "reading" })}
                            >
                                {tr(language, "books.reopenBook")}
                            </button>
                        </div>
                    </div>
                )}

                <div className="mt-8">
                    <h4 className="font-medium mb-2 text-secondary text-sm">{tr(language, "books.sessionsHistory")}</h4>
                    {sortedSessions.length === 0 ? (
                        <p className="text-secondary text-sm">{tr(language, "books.noSessions")}</p>
                    ) : (
                        <div className="space-y-3 max-h-44 overflow-y-auto pr-2 custom-scrollbar">
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
