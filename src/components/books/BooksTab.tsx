import { useState } from "react";
import { t as tr } from "../../i18n";
import { AppLanguage, Book, BookStatus } from "../../types";
import { BookCard } from "./BookCard";
import { BookEditModal } from "./BookEditModal";
import { BookSessionModal } from "./BookSessionModal";
import { Plus, Search } from "../ui/icons";
import { getBookActivityTimestamp, getBookProgressPercent, getBookRemainingPages } from "../../utils/books";

type BooksTabProps = {
    language: AppLanguage;
    books: Book[];
    onAddBook: (title: string, author?: string, coverUrl?: string, categories?: string[], totalPages?: number, status?: "want_to_read" | "reading" | "finished") => void;
    onUpdateBook: (id: string, updates: Partial<Book>) => void;
    onDeleteBook: (id: string) => void;
    onAddSession: (bookId: string, pagesRead: number, notes?: string) => void;
};

export function BooksTab({ language, books, onAddBook, onUpdateBook, onDeleteBook, onAddSession }: BooksTabProps) {
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editBook, setEditBook] = useState<Book | undefined>(undefined);
    const [sessionModalOpen, setSessionModalOpen] = useState(false);
    const [sessionBook, setSessionBook] = useState<Book | null>(null);
    const [query, setQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | BookStatus>("all");
    const [sortBy, setSortBy] = useState<"activity_desc" | "title_asc" | "progress_desc">("activity_desc");

    const handleCreateNew = () => {
        setEditBook(undefined);
        setEditModalOpen(true);
    };

    const normalizedQuery = query.trim().toLowerCase();
    const filteredBooks = books.filter((book) => {
        if (statusFilter !== "all" && book.status !== statusFilter) return false;
        if (!normalizedQuery) return true;
        const haystack = [
            book.title,
            book.author ?? "",
            ...book.categories
        ].join(" ").toLowerCase();
        return haystack.includes(normalizedQuery);
    });
    const sortedBooks = [...filteredBooks].sort((left, right) => {
        if (sortBy === "title_asc") {
            return left.title.localeCompare(right.title, language);
        }
        if (sortBy === "progress_desc") {
            return getBookProgressPercent(right) - getBookProgressPercent(left);
        }
        return getBookActivityTimestamp(right) - getBookActivityTimestamp(left);
    });
    const booksByStatus: Record<BookStatus, Book[]> = {
        reading: sortedBooks.filter((book) => book.status === "reading"),
        want_to_read: sortedBooks.filter((book) => book.status === "want_to_read"),
        finished: sortedBooks.filter((book) => book.status === "finished")
    };
    const sections: BookStatus[] = statusFilter === "all"
        ? ["reading", "want_to_read", "finished"]
        : [statusFilter];

    const totalBooks = books.length;
    const totalReading = books.filter((book) => book.status === "reading").length;
    const totalFinished = books.filter((book) => book.status === "finished").length;
    const totalRemainingPages = books
        .filter((book) => book.status !== "finished")
        .reduce((sum, book) => sum + getBookRemainingPages(book), 0);

    return (
        <div className="tab-container page-content fade-in p-4 lg:p-8 max-w-[1200px] mx-auto">
            <div className="books-header-row mb-6">
                <h2 className="section-title mb-0">{tr(language, "books.title")}</h2>
                <button
                    type="button"
                    className="glass-button primary-action inline-flex items-center gap-2"
                    onClick={handleCreateNew}
                >
                    <Plus size={16} />
                    {tr(language, "books.add")}
                </button>
            </div>

            {books.length === 0 ? (
                <div className="empty-state glass-panel panel-content text-center py-16">
                    <h3 className="text-xl font-bold mb-2">{tr(language, "books.noBooks")}</h3>
                    <p className="text-secondary mb-6">{tr(language, "books.emptyHint")}</p>
                    <button className="glass-button primary-action inline-flex items-center gap-2" onClick={handleCreateNew}>
                        <Plus size={16} />
                        {tr(language, "books.add")}
                    </button>
                </div>
            ) : (
                <div className="books-layout-stack">
                    <div className="books-summary-grid">
                        <article className="books-summary-card glass-panel">
                            <span>{tr(language, "books.summary.total")}</span>
                            <strong>{totalBooks}</strong>
                        </article>
                        <article className="books-summary-card glass-panel">
                            <span>{tr(language, "books.summary.reading")}</span>
                            <strong>{totalReading}</strong>
                        </article>
                        <article className="books-summary-card glass-panel">
                            <span>{tr(language, "books.summary.finished")}</span>
                            <strong>{totalFinished}</strong>
                        </article>
                        <article className="books-summary-card glass-panel">
                            <span>{tr(language, "books.summary.remainingPages")}</span>
                            <strong>{totalRemainingPages}</strong>
                        </article>
                    </div>

                    <div className="books-toolbar glass-panel panel-content">
                        <label className="books-search-field">
                            <Search size={16} />
                            <input
                                type="search"
                                className="glass-input"
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                placeholder={tr(language, "books.searchPlaceholder")}
                            />
                        </label>
                        <div className="books-toolbar-controls">
                            <div className="books-filter-chips">
                                <button
                                    type="button"
                                    className={`chip chip-outline ${statusFilter === "all" ? "active" : ""}`}
                                    onClick={() => setStatusFilter("all")}
                                >
                                    {tr(language, "books.filterAll")}
                                </button>
                                {(["reading", "want_to_read", "finished"] as BookStatus[]).map((status) => (
                                    <button
                                        key={status}
                                        type="button"
                                        className={`chip chip-outline ${statusFilter === status ? "active" : ""}`}
                                        onClick={() => setStatusFilter(status)}
                                    >
                                        {tr(language, `books.status.${status}`)}
                                    </button>
                                ))}
                            </div>
                            <label className="books-sort-select">
                                <span>{tr(language, "books.sortLabel")}</span>
                                <select
                                    className="glass-input"
                                    value={sortBy}
                                    onChange={(event) => setSortBy(event.target.value as "activity_desc" | "title_asc" | "progress_desc")}
                                >
                                    <option value="activity_desc">{tr(language, "books.sort.activity_desc")}</option>
                                    <option value="title_asc">{tr(language, "books.sort.title_asc")}</option>
                                    <option value="progress_desc">{tr(language, "books.sort.progress_desc")}</option>
                                </select>
                            </label>
                        </div>
                    </div>

                    {sortedBooks.length === 0 ? (
                        <div className="empty-state glass-panel panel-content text-center py-10">
                            <h3 className="text-xl font-bold mb-2">{tr(language, "books.noResults")}</h3>
                            <p className="text-secondary mb-4">{tr(language, "books.noResultsHint")}</p>
                            <button
                                type="button"
                                className="glass-button"
                                onClick={() => {
                                    setQuery("");
                                    setStatusFilter("all");
                                }}
                            >
                                {tr(language, "books.resetFilters")}
                            </button>
                        </div>
                    ) : (
                        <div className="books-grid-sections space-y-12">
                            {sections.map((status) => {
                                const sectionBooks = booksByStatus[status];
                                if (sectionBooks.length === 0) return null;
                                return (
                                    <section key={status}>
                                        <div className="books-section-title">
                                            <h3 className="text-xl font-bold mb-0">{tr(language, `books.status.${status}`)}</h3>
                                            <span>{sectionBooks.length}</span>
                                        </div>
                                        <div className={`books-grid ${status === "finished" ? "inactive" : ""}`}>
                                            {sectionBooks.map((book) => (
                                                <BookCard
                                                    key={book.id}
                                                    book={book}
                                                    language={language}
                                                    onEdit={() => {
                                                        setEditBook(book);
                                                        setEditModalOpen(true);
                                                    }}
                                                    onDelete={onDeleteBook}
                                                    onAddSession={() => {
                                                        setSessionBook(book);
                                                        setSessionModalOpen(true);
                                                    }}
                                                    onUpdateStatus={(nextStatus) => onUpdateBook(book.id, { status: nextStatus })}
                                                />
                                            ))}
                                        </div>
                                    </section>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {editModalOpen && (
                <BookEditModal
                    open={editModalOpen}
                    language={language}
                    bookToEdit={editBook}
                    onClose={() => setEditModalOpen(false)}
                    onSave={(title, author, coverUrl, categories, totalPages, status) => {
                        if (editBook) {
                            onUpdateBook(editBook.id, { title, author, coverUrl, categories, totalPages, status });
                        } else {
                            onAddBook(title, author, coverUrl, categories, totalPages, status);
                        }
                    }}
                />
            )}

            {sessionModalOpen && sessionBook && (
                <BookSessionModal
                    open={sessionModalOpen}
                    language={language}
                    book={sessionBook}
                    onClose={() => setSessionModalOpen(false)}
                    onSave={onAddSession}
                />
            )}
        </div>
    );
}
