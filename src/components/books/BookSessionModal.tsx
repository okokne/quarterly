import { useEffect, useState } from "react";
import { Book, AppLanguage } from "../../types";
import { t as tr } from "../../i18n";
import { formatDate } from "../../utils";
import { getBookProgressPercent, sortBookSessionsByDateDesc } from "../../utils/books";

type BookSessionModalProps = {
    open: boolean;
    language: AppLanguage;
    book: Book | null;
    onClose: () => void;
    onSave: (bookId: string, pagesRead: number, notes?: string) => void;
};

export function BookSessionModal({ open, language, book, onClose, onSave }: BookSessionModalProps) {
    const [pagesRead, setPagesRead] = useState("");
    const [notes, setNotes] = useState("");

    useEffect(() => {
        if (!open || !book) return;
        setPagesRead("");
        setNotes("");
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

    const handleSave = () => {
        if (parsedPages <= 0) return;

        onSave(book.id, nextTotalPages, notes.trim() || undefined);
        setPagesRead("");
        setNotes("");
        onClose();
    };

    return (
        <div className="modal-backdrop z-max">
            <div className="modal panel-content glass-panel">
                <div className="modal-header pb-4 pt-2">
                    <h3 className="m-0 text-xl font-bold">{tr(language, "books.addSession")}</h3>
                </div>
                <div className="mb-4">
                    <h3 className="font-semibold">{book.title}</h3>
                    <p className="text-secondary text-sm">{book.readPages} / {book.totalPages} {tr(language, "books.readPages")}</p>
                </div>

                <form
                    onSubmit={(event) => {
                        event.preventDefault();
                        handleSave();
                    }}
                >
                    <div className="form-group mt-4">
                        <label className="text-secondary">{tr(language, "books.sessionPagesLabel")}</label>
                        <input
                            type="number"
                            className="glass-input w-full mt-2"
                            value={pagesRead}
                            onChange={(event) => setPagesRead(event.target.value)}
                            placeholder="15"
                            min="1"
                            autoFocus
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
                        <button type="button" className="glass-button px-4 py-2" onClick={onClose}>
                            {tr(language, "common.cancel")}
                        </button>
                        <button
                            type="submit"
                            className="glass-button primary-action px-6 py-2"
                            disabled={parsedPages <= 0}
                        >
                            {tr(language, "common.save")}
                        </button>
                    </div>
                </form>

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
            </div>
        </div>
    );
}
