import { useCallback, Dispatch, SetStateAction } from "react";
import { Book, BookSession, BookStatus, Cycle } from "../types";
import { uid, toIsoDate } from "../utils";
import { StorageScope } from "../types";

type UseBooksStoreProps = {
    activeCycle: Cycle | null;
    isArchiveView: boolean;
    storageScope: StorageScope;
    books?: Book[];
    setBooks: Dispatch<SetStateAction<Book[]>>;
};

export function useBooksStore({
    activeCycle,
    isArchiveView,
    books = [],
    setBooks,
}: UseBooksStoreProps) {
    const addBook = useCallback((
        title: string,
        author?: string,
        coverUrl?: string,
        categories?: string[],
        totalPages?: number,
        status: BookStatus = "want_to_read"
    ) => {
        if (isArchiveView) return;
        const newBook: Book = {
            id: uid(),
            title,
            author,
            coverUrl,
            categories: categories || [],
            totalPages: totalPages || 0,
            readPages: 0,
            status,
            sessions: []
        };
        if (status === "reading") {
            newBook.startDate = toIsoDate(new Date());
        }
        if (status === "finished") {
            newBook.finishDate = toIsoDate(new Date());
        }
        setBooks([...books, newBook]);
    }, [books, isArchiveView, setBooks]);

    const updateBook = useCallback((id: string, updates: Partial<Book>) => {
        if (isArchiveView) return;
        setBooks(books.map(b => b.id === id ? { ...b, ...updates } : b));
    }, [books, isArchiveView, setBooks]);

    const deleteBook = useCallback((id: string) => {
        if (isArchiveView) return;
        setBooks(books.filter(b => b.id !== id));
    }, [books, isArchiveView, setBooks]);

    const addSession = useCallback((bookId: string, pagesRead: number, notes?: string) => {
        if (isArchiveView) return;
        setBooks(books.map(b => {
            if (b.id !== bookId) return b;
            const newSession: BookSession = {
                id: uid(),
                date: new Date().toISOString(),
                pagesRead,
                notes
            };
            const updatedSessions = [...b.sessions, newSession];
            updatedSessions.sort((s1, s2) => new Date(s2.date).getTime() - new Date(s1.date).getTime());
            return {
                ...b,
                readPages: pagesRead,
                sessions: updatedSessions,
            };
        }));
    }, [books, isArchiveView, setBooks]);

    return {
        books,
        setBooks,
        addBook,
        updateBook,
        deleteBook,
        addSession
    };
}
