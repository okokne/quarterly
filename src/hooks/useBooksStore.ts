import { useCallback, Dispatch, SetStateAction, useState, useEffect } from "react";
import { Book, BookSession, BookStatus, Cycle } from "../types";
import { uid, toIsoDate } from "../utils";
import { StorageScope } from "../types";
import { readScopedStorageValue, writeScopedStorageValue } from "../persistence/storageScope";
import { getNextQueueOrder, normalizeBookRecord, sanitizeBookCategories } from "../utils/books";

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
        const source = initialBooks.length > 0 ? initialBooks : stored;
        const todayIso = toIsoDate(new Date());
        let nextQueueOrder = 1;
        return source.map((book) => {
            const normalized = normalizeBookRecord(book, todayIso);
            if (normalized.status !== "finished" && normalized.readPages === 0) {
                const queueOrder = normalized.queueOrder ?? nextQueueOrder;
                nextQueueOrder = Math.max(nextQueueOrder, queueOrder + 1);
                return { ...normalized, queueOrder };
            }
            return normalized;
        });
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
        status: BookStatus = "reading"
    ) => {
        if (isArchiveView) return;
        const todayIso = toIsoDate(new Date());
        setBooks((prev) => {
            const normalizedStatus = status === "want_to_read" ? "reading" : status;
            const baseBook: Book = {
                id: uid(),
                title,
                author: author?.trim() || undefined,
                coverUrl: coverUrl?.trim() || undefined,
                categories: sanitizeBookCategories(categories),
                totalPages: totalPages || 0,
                readPages: 0,
                status: normalizedStatus,
                queueOrder: normalizedStatus === "finished" ? undefined : getNextQueueOrder(prev),
                sessions: []
            };
            const newBook = normalizeBookRecord(baseBook, todayIso);
            return [...prev, newBook];
        });
    }, [isArchiveView, setBooks]);

    const updateBook = useCallback((id: string, updates: Partial<Book>) => {
        if (isArchiveView) return;
        const todayIso = toIsoDate(new Date());
        setBooks((prev) => {
            const nextQueueOrder = getNextQueueOrder(prev, id);
            return prev.map((book) => {
                if (book.id !== id) return book;
                const merged: Book = {
                    ...book,
                    ...updates,
                    status: updates.status === "want_to_read" ? "reading" : (updates.status ?? book.status),
                    categories: updates.categories ? sanitizeBookCategories(updates.categories) : book.categories
                };
                const candidateReadPages = typeof merged.readPages === "number" ? merged.readPages : 0;
                const candidateStatus = merged.status === "want_to_read" ? "reading" : merged.status;
                if (candidateStatus !== "finished" && candidateReadPages === 0 && typeof merged.queueOrder !== "number") {
                    merged.queueOrder = nextQueueOrder;
                }
                return normalizeBookRecord(merged, todayIso);
            });
        });
    }, [isArchiveView, setBooks]);

    const deleteBook = useCallback((id: string) => {
        if (isArchiveView) return;
        setBooks((prev) => prev.filter((book) => book.id !== id));
    }, [isArchiveView, setBooks]);

    const addSession = useCallback((bookId: string, pagesRead: number, notes?: string) => {
        if (isArchiveView) return;
        const todayIso = toIsoDate(new Date());
        setBooks((prev) => prev.map((book) => {
            if (book.id !== bookId) return book;
            const newSession: BookSession = {
                id: uid(),
                date: new Date().toISOString(),
                pagesRead,
                notes
            };
            return normalizeBookRecord({
                ...book,
                readPages: pagesRead,
                sessions: [...book.sessions, newSession]
            }, todayIso);
        }));
    }, [isArchiveView, setBooks]);

    return {
        books,
        setBooks,
        addBook,
        updateBook,
        deleteBook,
        addSession
    };
}
