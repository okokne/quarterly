import { useCallback, Dispatch, SetStateAction, useState, useEffect } from "react";
import { Book, BookSession, BookStatus, Cycle } from "../types";
import { uid, toIsoDate } from "../utils";
import { StorageScope } from "../types";
import { readScopedStorageValue, writeScopedStorageValue } from "../persistence/storageScope";

const BOOKS_STORAGE_KEY = "twy_books";

function parseStoredBooks(raw: string | null): Book[] {
    if (!raw) return [];
    try {
        return JSON.parse(raw) as Book[];
    } catch {
        return [];
    }
}

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
    books: initialBooks = [],
    setBooks: externalSetBooks,
    storageScope
}: UseBooksStoreProps) {
    const [books, setInternalBooks] = useState<Book[]>(() => {
        const stored = parseStoredBooks(readScopedStorageValue(BOOKS_STORAGE_KEY, storageScope));
        // If persisted planner state passed us populated array (like from a json restore) use it
        return initialBooks.length > 0 ? initialBooks : stored;
    });

    const setBooks = useCallback((updater: Book[] | ((prev: Book[]) => Book[])) => {
        setInternalBooks((prev) => {
            const next = typeof updater === "function" ? updater(prev) : updater;
            externalSetBooks(next);
            return next;
        });
    }, [externalSetBooks]);

    useEffect(() => {
        try {
            writeScopedStorageValue(BOOKS_STORAGE_KEY, storageScope, JSON.stringify(books));
        } catch (err) {
            console.error("Failed to persist books:", err);
        }
    }, [books, storageScope]);

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
