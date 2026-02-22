import { FormEvent, useEffect, useMemo, useState } from "react";
import { t as tr } from "../../i18n";
import { AppLanguage, Book, BookStatus } from "../../types";
import { BookCard } from "./BookCard";
import { BookSessionModal } from "./BookSessionModal";
import { Plus } from "../ui/icons";
import {
    getBookActivityTimestamp,
    getBookRemainingPages,
    getFinishedBooksInYear,
    sortQueueBooks,
    getPagesReadThisWeek,
    getReadingStreakDays
} from "../../utils/books";
import { toIsoDate } from "../../utils";

type BooksTabProps = {
    language: AppLanguage;
    books: Book[];
    onAddBook: (title: string, author?: string, coverUrl?: string, categories?: string[], totalPages?: number, status?: "want_to_read" | "reading" | "finished") => void;
    onUpdateBook: (id: string, updates: Partial<Book>) => void;
    onDeleteBook: (id: string) => void;
    onAddSession: (bookId: string, pagesRead: number, durationMinutes?: number, notes?: string) => void;
};

type BookComposerDraft = {
    title: string;
    author: string;
    totalPages: string;
    coverUrl: string;
    status: BookStatus;
};

const EMPTY_DRAFT: BookComposerDraft = {
    title: "",
    author: "",
    totalPages: "",
    coverUrl: "",
    status: "want_to_read"
};

type FinishNotice = {
    id: string;
    text: string;
};

export function BooksTab({ language, books, onAddBook, onUpdateBook, onDeleteBook, onAddSession }: BooksTabProps) {
    const [composerOpen, setComposerOpen] = useState(false);
    const [draft, setDraft] = useState<BookComposerDraft>(EMPTY_DRAFT);
    const [activeBookId, setActiveBookId] = useState<string | null>(null);
    const [finishNotice, setFinishNotice] = useState<FinishNotice | null>(null);

    const todayIso = toIsoDate(new Date());
    const currentYear = Number.parseInt(todayIso.slice(0, 4), 10);

    const currentlyReading = useMemo(
        () => [...books]
            .filter((book) => book.status === "reading")
            .sort((left, right) => getBookActivityTimestamp(right) - getBookActivityTimestamp(left)),
        [books]
    );
    const queueBooks = useMemo(
        () => sortQueueBooks(books.filter((book) => book.status === "want_to_read")),
        [books]
    );
    const finished = useMemo(
        () => [...books]
            .filter((book) => book.status === "finished")
            .sort((left, right) => getBookActivityTimestamp(right) - getBookActivityTimestamp(left)),
        [books]
    );

    const streakDays = useMemo(() => getReadingStreakDays(books, todayIso), [books, todayIso]);
    const pagesThisWeek = useMemo(() => getPagesReadThisWeek(books, todayIso), [books, todayIso]);
    const booksThisYear = useMemo(() => getFinishedBooksInYear(books, currentYear), [books, currentYear]);
    const totalRemainingPages = useMemo(
        () => books.filter((book) => book.status !== "finished").reduce((sum, book) => sum + getBookRemainingPages(book), 0),
        [books]
    );

    const activeBook = activeBookId ? books.find((book) => book.id === activeBookId) ?? null : null;

    useEffect(() => {
        if (!activeBookId) return;
        if (!books.some((book) => book.id === activeBookId)) {
            setActiveBookId(null);
        }
    }, [activeBookId, books]);

    useEffect(() => {
        if (!finishNotice) return;
        const timeout = window.setTimeout(() => setFinishNotice(null), 2600);
        return () => window.clearTimeout(timeout);
    }, [finishNotice]);

    const handleAddBook = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!draft.title.trim()) return;
        const totalPages = Math.max(0, parseInt(draft.totalPages, 10) || 0);
        onAddBook(
            draft.title.trim(),
            draft.author.trim() || undefined,
            draft.coverUrl.trim() || undefined,
            [],
            totalPages,
            draft.status
        );
        setDraft(EMPTY_DRAFT);
        setComposerOpen(false);
    };

    const saveSession = (book: Book, pagesRead: number, durationMinutes?: number, notes?: string) => {
        if (book.status !== "reading") return;
        const normalizedPages = Math.max(0, Math.floor(pagesRead));
        if (normalizedPages <= 0) return;

        const nextRead = book.totalPages > 0
            ? Math.min(book.readPages + normalizedPages, book.totalPages)
            : (book.readPages + normalizedPages);
        const appliedPages = Math.max(0, nextRead - book.readPages);
        if (appliedPages <= 0) return;

        onAddSession(book.id, appliedPages, durationMinutes, notes);

        if (book.totalPages > 0 && nextRead >= book.totalPages) {
            setFinishNotice({
                id: book.id,
                text: tr(language, "books.readyToFinishNotice")
            });
            return;
        }

        setFinishNotice({
            id: book.id,
            text: tr(language, "books.sessionSaved")
        });
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

    const renderSection = (title: string, sectionBooks: Book[], sectionType: "reading" | "queue" | "finished") => (
        <section>
            <div className="books-section-title">
                <h3 className="text-xl font-bold mb-0">{title}</h3>
                <span>{sectionBooks.length}</span>
            </div>
            {sectionBooks.length === 0 ? (
                <div className="books-section-empty text-secondary">{tr(language, "books.sectionEmpty")}</div>
            ) : (
                <div className="books-list-compact">
                    {sectionBooks.map((book, index) => (
                        <BookCard
                            key={book.id}
                            book={book}
                            language={language}
                            onOpenDetails={() => setActiveBookId(book.id)}
                            onStartReading={book.status === "want_to_read" ? () => onUpdateBook(book.id, { status: "reading" }) : undefined}
                            queuePosition={sectionType === "queue" ? index + 1 : undefined}
                            queueTotal={sectionType === "queue" ? sectionBooks.length : undefined}
                            onMoveQueueUp={sectionType === "queue" && index > 0
                                ? () => moveQueueBook(book.id, -1)
                                : undefined}
                            onMoveQueueDown={sectionType === "queue" && index < sectionBooks.length - 1
                                ? () => moveQueueBook(book.id, 1)
                                : undefined}
                        />
                    ))}
                </div>
            )}
        </section>
    );

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

            {finishNotice && (
                <div className="books-finish-toast" role="status">
                    {finishNotice.text}
                </div>
            )}

            {composerOpen && (
                <form className="books-inline-composer glass-panel panel-content mb-10" onSubmit={handleAddBook}>
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
                            type="url"
                            className="glass-input"
                            value={draft.coverUrl}
                            onChange={(event) => setDraft((prev) => ({ ...prev, coverUrl: event.target.value }))}
                            placeholder={tr(language, "books.coverUrl")}
                        />
                    </div>

                    <div className="books-inline-status mt-4">
                        {(["want_to_read", "reading", "finished"] as BookStatus[]).map((status) => (
                            <button
                                key={status}
                                type="button"
                                className={`chip chip-outline ${draft.status === status ? "active" : ""}`}
                                onClick={() => setDraft((prev) => ({ ...prev, status }))}
                            >
                                {tr(language, `books.status.${status}`)}
                            </button>
                        ))}
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
                            <span>{tr(language, "books.streak")}</span>
                            <strong>{streakDays}</strong>
                        </article>
                        <article className="books-summary-card glass-panel">
                            <span>{tr(language, "books.pagesThisWeek")}</span>
                            <strong>{pagesThisWeek}</strong>
                        </article>
                        <article className="books-summary-card glass-panel">
                            <span>{tr(language, "books.booksThisYear")}</span>
                            <strong>{booksThisYear}</strong>
                        </article>
                        <article className="books-summary-card glass-panel">
                            <span>{tr(language, "books.yearOverview")}</span>
                            <strong>{tr(language, "books.yearOverviewValue", { count: booksThisYear })}</strong>
                        </article>
                        <article className="books-summary-card glass-panel">
                            <span>{tr(language, "books.summary.remainingPages")}</span>
                            <strong>{totalRemainingPages}</strong>
                        </article>
                    </div>

                    <div className="books-grid-sections space-y-8">
                        {renderSection(tr(language, "books.status.reading"), currentlyReading, "reading")}
                        {renderSection(tr(language, "books.queue"), queueBooks, "queue")}
                        {renderSection(tr(language, "books.status.finished"), finished, "finished")}
                    </div>
                </div>
            )}

            {activeBook && (
                <BookSessionModal
                    open={Boolean(activeBook)}
                    language={language}
                    book={activeBook}
                    onClose={() => setActiveBookId(null)}
                    onSave={(id, pagesRead, durationMinutes, notes) => {
                        const source = books.find((book) => book.id === id);
                        if (!source) return;
                        saveSession(source, pagesRead, durationMinutes, notes);
                    }}
                    onUpdateBook={onUpdateBook}
                    onDeleteBook={onDeleteBook}
                />
            )}
        </div>
    );
}
