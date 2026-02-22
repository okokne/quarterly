import { useState } from "react";
import { t as tr } from "../../i18n";
import { AppLanguage, Book } from "../../types";
import { BookCard } from "./BookCard";
import { BookEditModal } from "./BookEditModal";
import { BookSessionModal } from "./BookSessionModal";
import { Plus } from "../ui/icons";

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

    const currentlyReading = books.filter(b => b.status === "reading");
    const wantToRead = books.filter(b => b.status === "want_to_read");
    const finished = books.filter(b => b.status === "finished");

    const handleCreateNew = () => {
        setEditBook(undefined);
        setEditModalOpen(true);
    };

    return (
        <div className="tab-container page-content fade-in p-4 lg:p-8 max-w-[1200px] mx-auto">
            <div className="flex justify-between items-center mb-8">
                <h2 className="section-title mb-0">{tr(language, "books.title")}</h2>
                <button
                    className="glass-button primary-action icon-button rounded-full shadow-glow"
                    onClick={handleCreateNew}
                    title={tr(language, "books.add")}
                >
                    <Plus size={20} />
                </button>
            </div>

            {books.length === 0 ? (
                <div className="empty-state glass-panel panel-content text-center py-16">
                    <h3 className="text-xl font-bold mb-2">No books yet</h3>
                    <p className="text-secondary mb-6">Start tracking your reading journey.</p>
                    <button className="glass-button primary-action inline-flex items-center gap-2" onClick={handleCreateNew}>
                        <Plus size={16} />
                        {tr(language, "books.add")}
                    </button>
                </div>
            ) : (
                <div className="books-grid-sections space-y-12">
                    {currentlyReading.length > 0 && (
                        <section>
                            <h3 className="text-xl font-bold mb-4">{tr(language, "books.status_reading")}</h3>
                            <div className="books-grid">
                                {currentlyReading.map(book => (
                                    <BookCard
                                        key={book.id}
                                        book={book}
                                        language={language}
                                        onEdit={() => { setEditBook(book); setEditModalOpen(true); }}
                                        onDelete={onDeleteBook}
                                        onAddSession={() => { setSessionBook(book); setSessionModalOpen(true); }}
                                    />
                                ))}
                            </div>
                        </section>
                    )}

                    {wantToRead.length > 0 && (
                        <section>
                            <h3 className="text-xl font-bold mb-4 text-secondary">{tr(language, "books.status_want_to_read")}</h3>
                            <div className="books-grid">
                                {wantToRead.map(book => (
                                    <BookCard
                                        key={book.id}
                                        book={book}
                                        language={language}
                                        onEdit={() => { setEditBook(book); setEditModalOpen(true); }}
                                        onDelete={onDeleteBook}
                                        onAddSession={() => { setSessionBook(book); setSessionModalOpen(true); }}
                                    />
                                ))}
                            </div>
                        </section>
                    )}

                    {finished.length > 0 && (
                        <section>
                            <h3 className="text-xl font-bold mb-4 text-secondary">{tr(language, "books.status_finished")}</h3>
                            <div className="books-grid inactive">
                                {finished.map(book => (
                                    <BookCard
                                        key={book.id}
                                        book={book}
                                        language={language}
                                        onEdit={() => { setEditBook(book); setEditModalOpen(true); }}
                                        onDelete={onDeleteBook}
                                        onAddSession={() => { setSessionBook(book); setSessionModalOpen(true); }}
                                    />
                                ))}
                            </div>
                        </section>
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
