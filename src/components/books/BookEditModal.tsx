import { useState, useEffect } from "react";
import { Book, AppLanguage, BookStatus } from "../../types";
import { t as tr } from "../../i18n";

type BookEditModalProps = {
    open: boolean;
    language: AppLanguage;
    bookToEdit?: Book;
    onClose: () => void;
    onSave: (title: string, author?: string, coverUrl?: string, categories?: string[], totalPages?: number, status?: BookStatus) => void;
};

export function BookEditModal({ open, language, bookToEdit, onClose, onSave }: BookEditModalProps) {
    const [title, setTitle] = useState("");
    const [author, setAuthor] = useState("");
    const [coverUrl, setCoverUrl] = useState("");
    const [categoriesStr, setCategoriesStr] = useState("");
    const [totalPages, setTotalPages] = useState("");
    const [status, setStatus] = useState<BookStatus>("want_to_read");

    useEffect(() => {
        if (open) {
            setTitle(bookToEdit?.title ?? "");
            setAuthor(bookToEdit?.author ?? "");
            setCoverUrl(bookToEdit?.coverUrl ?? "");
            setCategoriesStr(bookToEdit?.categories.join(", ") ?? "");
            setTotalPages(bookToEdit?.totalPages ? String(bookToEdit.totalPages) : "");
            setStatus(bookToEdit?.status ?? "want_to_read");
        }
    }, [open, bookToEdit]);

    const handleSave = () => {
        if (!title.trim()) return;
        const parsedPages = parseInt(totalPages, 10);
        const categories = categoriesStr.split(",").map(c => c.trim()).filter(c => c.length > 0);
        onSave(
            title.trim(),
            author.trim() || undefined,
            coverUrl.trim() || undefined,
            categories,
            isNaN(parsedPages) ? 0 : parsedPages,
            status
        );
        onClose();
    };

    if (!open) return null;

    return (
        <div className="modal-backdrop z-max">
            <div className="modal panel-content glass-panel">
                <div className="modal-header pb-4 pt-2">
                    <h3 className="m-0 text-xl font-bold">{bookToEdit ? tr(language, "books.edit") : tr(language, "books.add")}</h3>
                </div>
                <div className="form-group">
                    <label className="text-secondary">{tr(language, "books.title")}</label>
                    <input
                        type="text"
                        className="glass-input w-full mt-2"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        autoFocus
                    />
                </div>

                <div className="form-group mt-4">
                    <label className="text-secondary">{tr(language, "books.bookAuthor")}</label>
                    <input
                        type="text"
                        className="glass-input w-full mt-2"
                        value={author}
                        onChange={e => setAuthor(e.target.value)}
                    />
                </div>

                <div className="form-group mt-4">
                    <label className="text-secondary">{tr(language, "books.coverUrl")}</label>
                    <input
                        type="text"
                        className="glass-input w-full mt-2"
                        value={coverUrl}
                        onChange={e => setCoverUrl(e.target.value)}
                        placeholder="https://..."
                    />
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="form-group">
                        <label className="text-secondary">{tr(language, "books.categories")}</label>
                        <input
                            type="text"
                            className="glass-input w-full mt-2"
                            value={categoriesStr}
                            onChange={e => setCategoriesStr(e.target.value)}
                            placeholder="Fantasy, Sci-Fi..."
                        />
                    </div>
                    <div className="form-group">
                        <label className="text-secondary">{tr(language, "books.totalPages")}</label>
                        <input
                            type="number"
                            className="glass-input w-full mt-2"
                            value={totalPages}
                            onChange={e => setTotalPages(e.target.value)}
                            min="0"
                        />
                    </div>
                </div>

                <div className="form-group mt-4">
                    <label className="text-secondary">{tr(language, "books.status")}</label>
                    <div className="status-toggle-group mt-2 flex gap-2">
                        {(["want_to_read", "reading", "finished"] as BookStatus[]).map(s => (
                            <button
                                key={s}
                                className={`glass-button flex-1 py-1 ${status === s ? 'active aura-glow' : ''}`}
                                onClick={() => setStatus(s)}
                            >
                                {tr(language, `books.status_${s}` as any)}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="modal-actions mt-6 flex justify-end gap-2">
                    <button className="glass-button px-4 py-2" onClick={onClose}>
                        {tr(language, "common.cancel")}
                    </button>
                    <button
                        className="glass-button primary-action px-6 py-2"
                        onClick={handleSave}
                        disabled={!title.trim()}
                    >
                        {tr(language, "common.save")}
                    </button>
                </div>
            </div>
        </div>
    );
}
