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
        let queueOrderCursor = 1;
        return source.map((book) => {
            const normalized = normalizeBookRecord(book, todayIso);
            if (normalized.status !== "want_to_read") return normalized;
            const ensuredOrder = normalized.queueOrder ?? queueOrderCursor;
            queueOrderCursor = Math.max(queueOrderCursor, ensuredOrder + 1);
            return { ...normalized, queueOrder: ensuredOrder };
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
        status: BookStatus = "want_to_read"
    ) => {
        if (isArchiveView) return;
        const todayIso = toIsoDate(new Date());
        setBooks((prev) => {
            const baseBook: Book = {
                id: uid(),
                title,
                author: author?.trim() || undefined,
                coverUrl: coverUrl?.trim() || undefined,
                categories: sanitizeBookCategories(categories),
                totalPages: totalPages || 0,
                readPages: 0,
                status,
                queueOrder: status === "want_to_read" ? getNextQueueOrder(prev) : undefined,
                startDate: status === "want_to_read" ? undefined : todayIso,
                finishDate: status === "finished" ? todayIso : undefined,
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
                    categories: updates.categories ? sanitizeBookCategories(updates.categories) : book.categories
                };

                if (merged.status === "reading") {
                    merged.startDate = merged.startDate ?? todayIso;
                    merged.finishDate = undefined;
                } else if (merged.status === "finished") {
                    merged.startDate = merged.startDate ?? todayIso;
                    merged.finishDate = merged.finishDate ?? todayIso;
                } else {
                    merged.startDate = undefined;
                    merged.finishDate = undefined;
                }

                if (merged.status === "want_to_read" && typeof merged.queueOrder !== "number") {
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

    const addSession = useCallback((bookId: string, pagesRead: number, durationMinutes?: number, notes?: string) => {
        if (isArchiveView) return;
        const todayIso = toIsoDate(new Date());
        setBooks((prev) => prev.map((book) => {
            if (book.id !== bookId) return book;
            const sessionPages = Math.max(0, Math.floor(pagesRead));
            if (sessionPages <= 0) return book;

            const currentRead = Math.max(0, Math.floor(book.readPages));
            const rawNextRead = currentRead + sessionPages;
            const nextRead = book.totalPages > 0 ? Math.min(rawNextRead, book.totalPages) : rawNextRead;
            const appliedPages = Math.max(0, nextRead - currentRead);
            if (appliedPages <= 0) return book;

            const normalizedDuration = Math.max(0, Math.floor(durationMinutes || 0)) || undefined;
            const normalizedNotes = notes?.trim() || undefined;
            const newSession: BookSession = {
                id: uid(),
                date: new Date().toISOString(),
                pagesRead: appliedPages,
                pageAfter: nextRead,
                durationMinutes: normalizedDuration,
                notes: normalizedNotes
            };
            return normalizeBookRecord({
                ...book,
                status: book.status,
                readPages: nextRead,
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
