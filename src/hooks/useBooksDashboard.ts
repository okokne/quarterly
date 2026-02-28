import { useMemo } from "react";
import { Book } from "../types";
import {
  getBookActivityTimestamp,
  getBookRemainingPages,
  getFinishedBooksInYear,
  getReadingMinutesInYear,
  getReadingMinutesThisWeek,
  getReadingMinutesTotal,
  getPagesReadThisWeek,
  getReadingStreakDays,
  sortQueueBooks,
} from "../utils/books";

export type BooksDashboardMetrics = {
  streakDays: number;
  pagesThisWeek: number;
  minutesThisWeek: number;
  minutesTotal: number;
  minutesThisYear: number;
  booksThisYear: number;
  totalSessions: number;
  avgMinutesPerSession: number;
  totalRemainingPages: number;
};

export function useBooksDashboard(books: Book[], todayIso: string) {
  const currentYear = Number.parseInt(todayIso.slice(0, 4), 10);

  const currentlyReading = useMemo(
    () =>
      [...books]
        .filter((book) => book.status === "reading")
        .sort((left, right) => getBookActivityTimestamp(right) - getBookActivityTimestamp(left)),
    [books]
  );

  const queueBooks = useMemo(
    () => sortQueueBooks(books.filter((book) => book.status === "want_to_read")),
    [books]
  );

  const finished = useMemo(
    () =>
      [...books]
        .filter((book) => book.status === "finished")
        .sort((left, right) => getBookActivityTimestamp(right) - getBookActivityTimestamp(left)),
    [books]
  );

  const metrics = useMemo<BooksDashboardMetrics>(() => {
    const streakDays = getReadingStreakDays(books, todayIso);
    const pagesThisWeek = getPagesReadThisWeek(books, todayIso);
    const minutesThisWeek = getReadingMinutesThisWeek(books, todayIso);
    const minutesTotal = getReadingMinutesTotal(books);
    const minutesThisYear = getReadingMinutesInYear(books, currentYear);
    const booksThisYear = getFinishedBooksInYear(books, currentYear);
    const totalSessions = books.reduce((sum, book) => sum + (book.sessions?.length ?? 0), 0);
    const avgMinutesPerSession = totalSessions > 0 ? Math.round(minutesTotal / totalSessions) : 0;
    const totalRemainingPages = books
      .filter((book) => book.status !== "finished")
      .reduce((sum, book) => sum + getBookRemainingPages(book), 0);

    return {
      streakDays,
      pagesThisWeek,
      minutesThisWeek,
      minutesTotal,
      minutesThisYear,
      booksThisYear,
      totalSessions,
      avgMinutesPerSession,
      totalRemainingPages,
    };
  }, [books, currentYear, todayIso]);

  return {
    currentlyReading,
    queueBooks,
    finished,
    metrics,
  };
}
