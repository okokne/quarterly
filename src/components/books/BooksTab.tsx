import { FormEvent, useEffect, useState } from "react";
import { t as tr } from "../../i18n";
import { AppLanguage, Book } from "../../types";
import { BookSessionModal } from "./BookSessionModal";
import { toIsoDate } from "../../utils";
import { BooksComposer, EMPTY_BOOK_DRAFT, BookComposerDraft } from "./BooksComposer";
import { BooksHeader, BooksView } from "./BooksHeader";
import { BooksInsightsView } from "./BooksInsightsView";
import { BooksLibraryView } from "./BooksLibraryView";
import { useBooksDashboard } from "../../hooks/useBooksDashboard";

type BooksTabProps = {
  language: AppLanguage;
  books: Book[];
  onAddBook: (
    title: string,
    author?: string,
    coverUrl?: string,
    categories?: string[],
    totalPages?: number,
    status?: "want_to_read" | "reading" | "finished"
  ) => void;
  onUpdateBook: (id: string, updates: Partial<Book>) => void;
  onDeleteBook: (id: string) => void;
  onAddSession: (bookId: string, pagesRead: number, durationMinutes?: number, notes?: string) => void;
};

type FinishNotice = {
  id: string;
  text: string;
};

export function BooksTab({ language, books, onAddBook, onUpdateBook, onDeleteBook, onAddSession }: BooksTabProps) {
  const [composerOpen, setComposerOpen] = useState(false);
  const [draft, setDraft] = useState<BookComposerDraft>(EMPTY_BOOK_DRAFT);
  const [activeBookId, setActiveBookId] = useState<string | null>(null);
  const [finishNotice, setFinishNotice] = useState<FinishNotice | null>(null);
  const [activeView, setActiveView] = useState<BooksView>("library");

  const todayIso = toIsoDate(new Date());
  const { currentlyReading, queueBooks, finished, metrics } = useBooksDashboard(books, todayIso);

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

  useEffect(() => {
    if (activeView === "insights") {
      setComposerOpen(false);
    }
  }, [activeView]);

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

    setDraft(EMPTY_BOOK_DRAFT);
    setComposerOpen(false);
  };

  const saveSession = (book: Book, pagesRead: number, durationMinutes?: number, notes?: string) => {
    if (book.status !== "reading") return;

    const normalizedPages = Math.max(0, Math.floor(pagesRead));
    if (normalizedPages <= 0) return;

    const nextRead =
      book.totalPages > 0
        ? Math.min(book.readPages + normalizedPages, book.totalPages)
        : book.readPages + normalizedPages;
    const appliedPages = Math.max(0, nextRead - book.readPages);
    if (appliedPages <= 0) return;

    onAddSession(book.id, appliedPages, durationMinutes, notes);

    if (book.totalPages > 0 && nextRead >= book.totalPages) {
      setFinishNotice({
        id: book.id,
        text: tr(language, "books.readyToFinishNotice"),
      });
      return;
    }

    setFinishNotice({
      id: book.id,
      text: tr(language, "books.sessionSaved"),
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

  return (
    <section className="card books-tab-card">
      <BooksHeader
        language={language}
        activeView={activeView}
        composerOpen={composerOpen}
        onToggleComposer={() => setComposerOpen((prev) => !prev)}
        onChangeView={setActiveView}
      />

      {finishNotice && (
        <div className="books-finish-toast" role="status">
          {finishNotice.text}
        </div>
      )}

      {activeView === "library" && composerOpen && (
        <BooksComposer
          language={language}
          draft={draft}
          setDraft={setDraft}
          onSubmit={handleAddBook}
        />
      )}

      {activeView === "insights" ? (
        <BooksInsightsView language={language} metrics={metrics} />
      ) : books.length === 0 ? (
        <div className="subcard books-empty-state">
          <h3>{tr(language, "books.noBooks")}</h3>
          <p className="muted">{tr(language, "books.emptyHint")}</p>
        </div>
      ) : (
        <BooksLibraryView
          language={language}
          currentlyReading={currentlyReading}
          queueBooks={queueBooks}
          finished={finished}
          onOpenDetails={setActiveBookId}
          onStartReading={(bookId) => onUpdateBook(bookId, { status: "reading" })}
          onMoveQueueBook={moveQueueBook}
        />
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
    </section>
  );
}
