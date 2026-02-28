import { AppLanguage, Book } from "../../types";
import { t as tr } from "../../i18n";
import { BookCard } from "./BookCard";

type BooksLibraryViewProps = {
  language: AppLanguage;
  currentlyReading: Book[];
  queueBooks: Book[];
  finished: Book[];
  onOpenDetails: (bookId: string) => void;
  onStartReading: (bookId: string) => void;
  onMoveQueueBook: (bookId: string, direction: -1 | 1) => void;
};

type SectionType = "reading" | "queue" | "finished";

function sectionTitle(language: AppLanguage, sectionType: SectionType): string {
  if (sectionType === "reading") return tr(language, "books.status.reading");
  if (sectionType === "queue") return tr(language, "books.queue");
  return tr(language, "books.status.finished");
}

export function BooksLibraryView({
  language,
  currentlyReading,
  queueBooks,
  finished,
  onOpenDetails,
  onStartReading,
  onMoveQueueBook,
}: BooksLibraryViewProps) {
  const renderSection = (sectionType: SectionType, sectionBooks: Book[], featured = false) => (
    <section className={`subcard books-section-card ${featured ? "books-section-priority" : ""}`}>
      <div className="books-section-title">
        <h3 className="books-section-heading">{sectionTitle(language, sectionType)}</h3>
        <span>{sectionBooks.length}</span>
      </div>

      {sectionBooks.length === 0 ? (
        <div className="books-section-empty">{tr(language, "books.sectionEmpty")}</div>
      ) : (
        <div className="books-list-compact">
          {sectionBooks.map((book, index) => (
            <BookCard
              key={book.id}
              book={book}
              language={language}
              onOpenDetails={() => onOpenDetails(book.id)}
              onStartReading={
                sectionType === "queue"
                  ? () => onStartReading(book.id)
                  : undefined
              }
              queuePosition={sectionType === "queue" ? index + 1 : undefined}
              queueTotal={sectionType === "queue" ? sectionBooks.length : undefined}
              onMoveQueueUp={
                sectionType === "queue" && index > 0
                  ? () => onMoveQueueBook(book.id, -1)
                  : undefined
              }
              onMoveQueueDown={
                sectionType === "queue" && index < sectionBooks.length - 1
                  ? () => onMoveQueueBook(book.id, 1)
                  : undefined
              }
            />
          ))}
        </div>
      )}
    </section>
  );

  return (
    <div className="books-library-layout">
      {renderSection("reading", currentlyReading, true)}
      <div className="books-library-secondary-grid">
        {renderSection("queue", queueBooks)}
        {renderSection("finished", finished)}
      </div>
    </div>
  );
}
