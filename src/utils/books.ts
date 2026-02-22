import { Book, BookSession } from "../types";
import { parseIso, toIsoDate } from "../utils";

function toPositiveInt(value: number | undefined): number {
    if (typeof value !== "number" || Number.isNaN(value)) return 0;
    return Math.max(0, Math.floor(value));
}

function toOptionalPositiveInt(value: number | undefined): number | undefined {
    if (typeof value !== "number" || Number.isNaN(value)) return undefined;
    const normalized = Math.floor(value);
    return normalized > 0 ? normalized : undefined;
}

function toOptionalText(value: string | undefined): string | undefined {
    const next = value?.trim();
    return next ? next : undefined;
}

function getSessionDate(session: BookSession): string {
    const isoDate = session.date.slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(isoDate) ? isoDate : toIsoDate(new Date(session.date));
}

function addIsoDays(dateIso: string, delta: number): string {
    const next = parseIso(dateIso);
    next.setDate(next.getDate() + delta);
    return toIsoDate(next);
}

function getStartOfWeekIso(dateIso: string): string {
    const date = parseIso(dateIso);
    const jsDay = date.getDay(); // 0=Sun..6=Sat
    const mondayOffset = jsDay === 0 ? -6 : 1 - jsDay;
    date.setDate(date.getDate() + mondayOffset);
    return toIsoDate(date);
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

export function sortBookSessionsByDateAsc(sessions: BookSession[]): BookSession[] {
    return [...sessions].sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime());
}

export function getBookActivityTimestamp(book: Book): number {
    const latestSessionTs = book.sessions.reduce<number>((latest, session) => {
        const ts = new Date(session.date).getTime();
        return Number.isFinite(ts) ? Math.max(latest, ts) : latest;
    }, 0);
    if (latestSessionTs > 0) return latestSessionTs;
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
        if (book.status !== "want_to_read") return max;
        return Math.max(max, book.queueOrder ?? 0);
    }, 0);
    return highest + 1;
}

type SessionIncrement = {
    date: string;
    pages: number;
};

export function getBookSessionIncrements(book: Book): SessionIncrement[] {
    const sortedAsc = sortBookSessionsByDateAsc(book.sessions);
    let previousTotal = 0;
    return sortedAsc.map((session) => {
        const rawPages = toPositiveInt(session.pagesRead);
        const hasPageAfter = typeof session.pageAfter === "number" && Number.isFinite(session.pageAfter);
        let pages = 0;

        if (hasPageAfter) {
            const nextTotal = Math.max(previousTotal, toPositiveInt(session.pageAfter));
            pages = Math.max(0, nextTotal - previousTotal);
            previousTotal = nextTotal;
        } else if (rawPages >= previousTotal) {
            // Backward compatibility for legacy cumulative session logs.
            pages = Math.max(0, rawPages - previousTotal);
            previousTotal = Math.max(previousTotal, rawPages);
        } else {
            // New logs store per-session pages directly.
            pages = rawPages;
            previousTotal += rawPages;
        }

        return {
            date: getSessionDate(session),
            pages
        };
    }).filter((entry) => entry.pages > 0);
}

export function getReadingStreakDays(books: Book[], todayIso: string): number {
    const readingDays = new Set<string>();
    books.forEach((book) => {
        getBookSessionIncrements(book).forEach((entry) => readingDays.add(entry.date));
    });
    if (readingDays.size === 0) return 0;

    const sortedDays = Array.from(readingDays).sort((left, right) => right.localeCompare(left));
    const latest = sortedDays[0];
    if (!latest) return 0;

    const latestTs = parseIso(latest).getTime();
    const todayTs = parseIso(todayIso).getTime();
    const dayDiff = Math.floor((todayTs - latestTs) / 86400000);
    if (dayDiff > 1) return 0;

    let streak = 0;
    let cursor = latest;
    while (readingDays.has(cursor)) {
        streak += 1;
        cursor = addIsoDays(cursor, -1);
    }
    return streak;
}

export function getPagesReadThisWeek(books: Book[], todayIso: string): number {
    const weekStartIso = getStartOfWeekIso(todayIso);
    let total = 0;
    books.forEach((book) => {
        getBookSessionIncrements(book).forEach((entry) => {
            if (entry.date >= weekStartIso && entry.date <= todayIso) {
                total += entry.pages;
            }
        });
    });
    return total;
}

export function getFinishedBooksInYear(books: Book[], year: number): number {
    const prefix = `${year}-`;
    return books.filter((book) => book.status === "finished" && (book.finishDate ?? "").startsWith(prefix)).length;
}

export type BookCompletionStats = {
    totalPages: number;
    readingDays: number;
    pagesPerDay: number;
};

export function getBookCompletionStats(book: Book, finishDateIso?: string): BookCompletionStats {
    const fallbackFinish = finishDateIso ?? toIsoDate(new Date());
    const finishDate = book.finishDate ?? fallbackFinish;
    const sessionsDesc = sortBookSessionsByDateDesc(book.sessions);
    const earliestSession = sessionsDesc[sessionsDesc.length - 1];
    const firstSessionDate = earliestSession ? getSessionDate(earliestSession) : undefined;
    const startDate = book.startDate ?? firstSessionDate ?? finishDate;

    const startTs = parseIso(startDate).getTime();
    const finishTs = parseIso(finishDate).getTime();
    const rawDays = Math.floor((finishTs - startTs) / 86400000) + 1;
    const readingDays = Math.max(1, rawDays);
    const totalPages = Math.max(0, book.totalPages > 0 ? book.totalPages : book.readPages);
    const pagesPerDay = readingDays > 0 ? Math.round(totalPages / readingDays) : totalPages;

    return { totalPages, readingDays, pagesPerDay };
}

export function normalizeBookRecord(book: Book, todayIso: string): Book {
    const totalPages = toPositiveInt(book.totalPages);
    let readPages = toPositiveInt(book.readPages);
    let status = book.status;
    const hasProgressSessions = (book.sessions ?? []).some((session) => toPositiveInt(session.pagesRead) > 0);

    // Migration hint: old "queue" items were stored as reading with 0 pages.
    if (status === "reading" && readPages === 0 && !book.startDate && !hasProgressSessions) {
        status = "want_to_read";
    }

    if (status === "finished" && totalPages > 0) {
        readPages = totalPages;
    }
    if (totalPages > 0) {
        readPages = Math.min(readPages, totalPages);
    }
    if (readPages > 0 && status === "want_to_read") {
        status = "reading";
    }

    const sessions = sortBookSessionsByDateDesc((book.sessions ?? []).map((session) => ({
        ...session,
        pagesRead: toPositiveInt(session.pagesRead),
        pageAfter: toOptionalPositiveInt(session.pageAfter),
        durationMinutes: toOptionalPositiveInt(session.durationMinutes),
        notes: toOptionalText(session.notes)
    })));
    const categories = sanitizeBookCategories(book.categories);
    const queueOrder = status === "want_to_read" ? toOptionalPositiveInt(book.queueOrder) : undefined;
    const startDate = status === "want_to_read"
        ? undefined
        : (book.startDate ?? todayIso);
    const finishDate = status === "finished"
        ? (book.finishDate ?? todayIso)
        : undefined;

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
