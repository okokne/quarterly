import { Book, BookSession } from "../types";

function toPositiveInt(value: number | undefined): number {
    if (typeof value !== "number" || Number.isNaN(value)) return 0;
    return Math.max(0, Math.floor(value));
}

function toOptionalPositiveInt(value: number | undefined): number | undefined {
    if (typeof value !== "number" || Number.isNaN(value)) return undefined;
    const normalized = Math.floor(value);
    return normalized > 0 ? normalized : undefined;
}

export function sanitizeBookCategories(categories: string[] = []): string[] {
    const unique = new Set<string>();
    categories.forEach((entry) => {
        const next = entry.trim();
        if (next.length > 0) {
            unique.add(next);
        }
    });
    return Array.from(unique);
}

export function getBookProgressPercent(book: Pick<Book, "readPages" | "totalPages">): number {
    if (book.totalPages <= 0) return 0;
    return Math.min(100, Math.round((book.readPages / book.totalPages) * 100));
}

export function getBookRemainingPages(book: Pick<Book, "readPages" | "totalPages">): number {
    if (book.totalPages <= 0) return 0;
    return Math.max(0, book.totalPages - book.readPages);
}

export function sortBookSessionsByDateDesc(sessions: BookSession[]): BookSession[] {
    return [...sessions].sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime());
}

export function getBookActivityTimestamp(book: Book): number {
    const latestSession = book.sessions.reduce<number>((latest, session) => {
        const ts = new Date(session.date).getTime();
        return Number.isFinite(ts) ? Math.max(latest, ts) : latest;
    }, 0);
    if (latestSession > 0) return latestSession;
    const finishTs = book.finishDate ? new Date(book.finishDate).getTime() : 0;
    const startTs = book.startDate ? new Date(book.startDate).getTime() : 0;
    return Math.max(finishTs || 0, startTs || 0);
}

export function sortQueueBooks(books: Book[]): Book[] {
    return [...books].sort((left, right) => {
        const leftOrder = left.queueOrder ?? Number.MAX_SAFE_INTEGER;
        const rightOrder = right.queueOrder ?? Number.MAX_SAFE_INTEGER;
        if (leftOrder !== rightOrder) return leftOrder - rightOrder;
        return left.title.localeCompare(right.title);
    });
}

export function getNextQueueOrder(books: Book[], ignoreId?: string): number {
    const highest = books.reduce((max, book) => {
        if (ignoreId && book.id === ignoreId) return max;
        if (book.status === "finished") return max;
        if (book.readPages > 0) return max;
        return Math.max(max, book.queueOrder ?? 0);
    }, 0);
    return highest + 1;
}

export function normalizeBookRecord(book: Book, todayIso: string): Book {
    const totalPages = toPositiveInt(book.totalPages);
    let readPages = toPositiveInt(book.readPages);
    let status = book.status === "want_to_read" ? "reading" : book.status;

    if (status === "finished" && totalPages > 0) {
        readPages = totalPages;
    }

    if (totalPages > 0) {
        readPages = Math.min(readPages, totalPages);
    }

    if (totalPages > 0 && readPages >= totalPages) {
        status = "finished";
    } else if (readPages > 0 && status !== "finished") {
        status = "reading";
    }

    const sessions = sortBookSessionsByDateDesc(book.sessions ?? []);
    const categories = sanitizeBookCategories(book.categories);
    const isQueueBook = status !== "finished" && readPages === 0;
    const startDate = status === "finished" || readPages > 0
        ? (book.startDate ?? todayIso)
        : undefined;
    const finishDate = status === "finished"
        ? (book.finishDate ?? todayIso)
        : undefined;
    const queueOrder = isQueueBook ? toOptionalPositiveInt(book.queueOrder) : undefined;

    return {
        ...book,
        categories,
        totalPages,
        readPages,
        status,
        queueOrder,
        sessions,
        startDate,
        finishDate
    };
}
