import { useState } from "react";
import { Book, AppLanguage } from "../../types";
import { t as tr } from "../../i18n";
import { formatDate } from "../../utils";

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

    // Reset when modal opens for a new book session
    if (!open || !book) return null;

    const handleSave = () => {
        const parsedPages = parseInt(pagesRead, 10);
        if (isNaN(parsedPages)) return;

        onSave(book.id, parsedPages, notes.trim() || undefined);
        setPagesRead("");
        setNotes("");
        onClose();
    };

    return (
        <div className="modal-backdrop z-max">
            <div className="modal panel-content glass-panel">
                <div className="modal-header pb-4 pt-2">
                    <h3 className="m-0 text-xl font-bold">{tr(language, "books.reading_session")}</h3>
                </div>
                <div className="mb-4">
                    <h3 className="font-semibold">{book.title}</h3>
                    <p className="text-secondary text-sm">{book.readPages} / {book.totalPages} {tr(language, "books.pages_read")}</p>
                </div>

                <div className="form-group mt-4">
                    <label className="text-secondary">{tr(language, "books.pages_read")} (New Total)</label>
                    <input
                        type="number"
                        className="glass-input w-full mt-2"
                        value={pagesRead}
                        onChange={e => setPagesRead(e.target.value)}
                        placeholder={String(book.readPages)}
                        min={book.readPages}
                        max={book.totalPages > 0 ? book.totalPages : undefined}
                        autoFocus
                    />
                </div>

                <div className="form-group mt-4">
                    <label className="text-secondary">{tr(language, "books.notes")}</label>
                    <textarea
                        className="glass-input w-full mt-2 resize-none h-24"
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        placeholder="Key takeaways, thoughts..."
                    />
                </div>

                <div className="modal-actions mt-6 flex justify-end gap-2">
                    <button className="glass-button px-4 py-2" onClick={onClose}>
                        {tr(language, "common.cancel")}
                    </button>
                    <button
                        className="glass-button primary-action px-6 py-2"
                        onClick={handleSave}
                        disabled={!pagesRead || isNaN(parseInt(pagesRead))}
                    >
                        {tr(language, "common.save")}
                    </button>
                </div>

                {book.sessions && book.sessions.length > 0 && (
                    <div className="mt-8">
                        <h4 className="font-medium mb-2 text-secondary text-sm">Previous Sessions</h4>
                        <div className="space-y-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                            {[...book.sessions].reverse().map(session => (
                                <div key={session.id} className="book-session-item glass-panel p-3 text-sm">
                                    <div className="flex justify-between text-secondary mb-1">
                                        <span>{formatDate(session.date.split("T")[0], "iso", language)}</span>
                                        <span>Page {session.pagesRead}</span>
                                    </div>
                                    {session.notes && <p className="mt-1">{session.notes}</p>}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
