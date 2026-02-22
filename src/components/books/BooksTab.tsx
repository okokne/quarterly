import { FormEvent, useEffect, useMemo, useState } from "react";
import { t as tr } from "../../i18n";
import { AppLanguage, Book } from "../../types";
import { BookCard } from "./BookCard";
import { BookSessionModal } from "./BookSessionModal";
import { Plus } from "../ui/icons";
import { getBookActivityTimestamp, getBookRemainingPages, sanitizeBookCategories, sortQueueBooks } from "../../utils/books";

type BooksTabProps = {
    language: AppLanguage;
    books: Book[];
    onAddBook: (title: string, author?: string, coverUrl?: string, categories?: string[], totalPages?: number, status?: "want_to_read" | "reading" | "finished") => void;
    onUpdateBook: (id: string, updates: Partial<Book>) => void;
    onDeleteBook: (id: string) => void;
    onAddSession: (bookId: string, pagesRead: number, notes?: string) => void;
};

type BookComposerDraft = {
    title: string;
    author: string;
    coverUrl: string;
    categories: string;
    totalPages: string;
    status: "reading" | "finished";
};

const EMPTY_DRAFT: BookComposerDraft = {
    title: "",
    author: "",
    coverUrl: "",
    categories: "",
    totalPages: "",
    status: "reading"
};

export function BooksTab({ language, books, onAddBook, onUpdateBook, onDeleteBook, onAddSession }: BooksTabProps) {
    const [composerOpen, setComposerOpen] = useState(false);
    const [draft, setDraft] = useState<BookComposerDraft>(EMPTY_DRAFT);
    const [activeBookId, setActiveBookId] = useState<string | null>(null);

    const queueBooks = useMemo(
        () => sortQueueBooks(books.filter((book) => book.status !== "finished" && book.readPages === 0)),
        [books]
    );
    const readingBooks = useMemo(
        () => [...books]
            .filter((book) => book.status !== "finished" && book.readPages > 0)
            .sort((left, right) => getBookActivityTimestamp(right) - getBookActivityTimestamp(left)),
        [books]
    );
    const finishedBooks = useMemo(
        () => [...books]
            .filter((book) => book.status === "finished")
            .sort((left, right) => getBookActivityTimestamp(right) - getBookActivityTimestamp(left)),
        [books]
    );

    const totalRemainingPages = books
        .filter((book) => book.status !== "finished")
        .reduce((sum, book) => sum + getBookRemainingPages(book), 0);

    const activeBook = activeBookId ? books.find((book) => book.id === activeBookId) ?? null : null;

    useEffect(() => {
        if (!activeBookId) return;
        if (!books.some((book) => book.id === activeBookId)) {
            setActiveBookId(null);
        }
    }, [activeBookId, books]);

    const handleAddBook = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!draft.title.trim()) return;
        const totalPages = Math.max(0, parseInt(draft.totalPages, 10) || 0);
        onAddBook(
            draft.title.trim(),
            draft.author.trim() || undefined,
            draft.coverUrl.trim() || undefined,
            sanitizeBookCategories(draft.categories.split(",")),
            totalPages,
            draft.status
        );
        setDraft(EMPTY_DRAFT);
        setComposerOpen(false);
    };

    const moveQueueBook = (bookId: string, direction: -1 | 1) => {
        const currentIndex = queueBooks.findIndex((book) => book.id === bookId);
        if (currentIndex < 0) return;
        const targetIndex = currentIndex + direction;
        if (targetIndex < 0 || targetIndex >= queueBooks.length) return;

        const currentBook = queueBooks[currentIndex];
        const targetBook = queueBooks[targetIndex];
        const currentOrder = currentBook.queueOrder ?? currentIndex + 1;
        const targetOrder = targetBook.queueOrder ?? targetIndex + 1;

        onUpdateBook(currentBook.id, { queueOrder: targetOrder });
        onUpdateBook(targetBook.id, { queueOrder: currentOrder });
    };

    const renderBooksSection = (title: string, sectionBooks: Book[], sectionClassName?: string) => {
        if (sectionBooks.length === 0) return null;
        return (
            <section>
                <div className="books-section-title">
                    <h3 className="text-xl font-bold mb-0">{title}</h3>
                    <span>{sectionBooks.length}</span>
                </div>
                <div className={`books-list-compact ${sectionClassName ?? ""}`}>
                    {sectionBooks.map((book, index) => (
                        <BookCard
                            key={book.id}
                            book={book}
                            language={language}
                            onOpenDetails={() => setActiveBookId(book.id)}
                            queuePosition={sectionClassName === "queue" ? index + 1 : undefined}
                            queueTotal={sectionClassName === "queue" ? sectionBooks.length : undefined}
                            onMoveQueueUp={sectionClassName === "queue" && index > 0 ? () => moveQueueBook(book.id, -1) : undefined}
                            onMoveQueueDown={sectionClassName === "queue" && index < sectionBooks.length - 1 ? () => moveQueueBook(book.id, 1) : undefined}
                        />
                    ))}
                </div>
            </section>
        );
    };

    return (
        <div className="tab-container page-content fade-in p-4 lg:p-8 max-w-[1000px] mx-auto">
            <div className="books-header-row mb-3">
                <h2 className="section-title mb-0">{tr(language, "books.title")}</h2>
                <button
                    type="button"
                    className={`glass-button books-add-toggle ${composerOpen ? "open" : ""}`}
                    onClick={() => setComposerOpen((prev) => !prev)}
                    aria-expanded={composerOpen}
                >
                    <span className="books-add-toggle-icon" aria-hidden="true">
                        <Plus size={15} />
                    </span>
                    <span>{composerOpen ? tr(language, "common.close") : tr(language, "books.add")}</span>
                </button>
            </div>

            {composerOpen && (
                <form className="books-inline-composer glass-panel panel-content mb-6" onSubmit={handleAddBook}>
                    <p className="text-secondary mb-4">{tr(language, "books.inlineAddHint")}</p>
                    <div className="grid md:grid-cols-2 gap-3">
                        <input
                            type="text"
                            className="glass-input"
                            value={draft.title}
                            onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
                            placeholder={tr(language, "books.bookTitle")}
                            autoFocus
                        />
                        <input
                            type="text"
                            className="glass-input"
                            value={draft.author}
                            onChange={(event) => setDraft((prev) => ({ ...prev, author: event.target.value }))}
                            placeholder={tr(language, "books.bookAuthor")}
                        />
                        <input
                            type="number"
                            className="glass-input"
                            value={draft.totalPages}
                            min="0"
                            onChange={(event) => setDraft((prev) => ({ ...prev, totalPages: event.target.value }))}
                            placeholder={tr(language, "books.totalPages")}
                        />
                        <input
                            type="text"
                            className="glass-input"
                            value={draft.categories}
                            onChange={(event) => setDraft((prev) => ({ ...prev, categories: event.target.value }))}
                            placeholder={tr(language, "books.categoriesPlaceholder")}
                        />
                        <input
                            type="url"
                            className="glass-input md:col-span-2"
                            value={draft.coverUrl}
                            onChange={(event) => setDraft((prev) => ({ ...prev, coverUrl: event.target.value }))}
                            placeholder={tr(language, "books.coverUrl")}
                        />
                    </div>

                    <div className="books-inline-status mt-4">
                        <button
                            type="button"
                            className={`chip chip-outline ${draft.status === "reading" ? "active" : ""}`}
                            onClick={() => setDraft((prev) => ({ ...prev, status: "reading" }))}
                        >
                            {tr(language, "books.status.reading")}
                        </button>
                        <button
                            type="button"
                            className={`chip chip-outline ${draft.status === "finished" ? "active" : ""}`}
                            onClick={() => setDraft((prev) => ({ ...prev, status: "finished" }))}
                        >
                            {tr(language, "books.status.finished")}
                        </button>
                        <span className="text-secondary">{tr(language, "books.statusLockedHint", { status: tr(language, `books.status.${draft.status}`) })}</span>
                    </div>

                    <div className="books-inline-actions mt-4">
                        <button type="submit" className="glass-button primary-action" disabled={!draft.title.trim()}>
                            {tr(language, "books.add")}
                        </button>
                    </div>
                </form>
            )}

            {books.length === 0 ? (
                <div className="empty-state glass-panel panel-content text-center py-14">
                    <h3 className="text-xl font-bold mb-2">{tr(language, "books.noBooks")}</h3>
                    <p className="text-secondary mb-0">{tr(language, "books.emptyHint")}</p>
                </div>
            ) : (
                <div className="books-layout-stack">
                    <div className="books-summary-grid">
                        <article className="books-summary-card glass-panel">
                            <span>{tr(language, "books.summary.total")}</span>
                            <strong>{books.length}</strong>
                        </article>
                        <article className="books-summary-card glass-panel">
                            <span>{tr(language, "books.summary.reading")}</span>
                            <strong>{readingBooks.length}</strong>
                        </article>
                        <article className="books-summary-card glass-panel">
                            <span>{tr(language, "books.summary.finished")}</span>
                            <strong>{finishedBooks.length}</strong>
                        </article>
                        <article className="books-summary-card glass-panel">
                            <span>{tr(language, "books.summary.remainingPages")}</span>
                            <strong>{totalRemainingPages}</strong>
                        </article>
                    </div>

                    <div className="books-grid-sections space-y-8">
                        {renderBooksSection(tr(language, "books.queue"), queueBooks, "queue")}
                        {renderBooksSection(tr(language, "books.status.reading"), readingBooks)}
                        {renderBooksSection(tr(language, "books.status.finished"), finishedBooks, "inactive")}
                    </div>
                </div>
            )}

            {activeBook && (
                <BookSessionModal
                    open={Boolean(activeBook)}
                    language={language}
                    book={activeBook}
                    onClose={() => setActiveBookId(null)}
                    onSave={onAddSession}
                    onUpdateBook={onUpdateBook}
                    onDeleteBook={onDeleteBook}
                />
            )}
        </div>
    );
}
