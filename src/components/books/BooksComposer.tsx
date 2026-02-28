import { Dispatch, FormEvent, SetStateAction } from "react";
import { t as tr } from "../../i18n";
import { AppLanguage, BookStatus } from "../../types";

export type BookComposerDraft = {
  title: string;
  author: string;
  totalPages: string;
  coverUrl: string;
  status: BookStatus;
};

export const EMPTY_BOOK_DRAFT: BookComposerDraft = {
  title: "",
  author: "",
  totalPages: "",
  coverUrl: "",
  status: "want_to_read",
};

type BooksComposerProps = {
  language: AppLanguage;
  draft: BookComposerDraft;
  setDraft: Dispatch<SetStateAction<BookComposerDraft>>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function BooksComposer({ language, draft, setDraft, onSubmit }: BooksComposerProps) {
  return (
    <form className="subcard books-inline-composer" onSubmit={onSubmit}>
      <p className="books-inline-hint">{tr(language, "books.inlineAddHint")}</p>

      <div className="books-inline-grid">
        <input
          type="text"
          value={draft.title}
          onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
          placeholder={tr(language, "books.bookTitle")}
          autoFocus
        />
        <input
          type="text"
          value={draft.author}
          onChange={(event) => setDraft((prev) => ({ ...prev, author: event.target.value }))}
          placeholder={tr(language, "books.bookAuthor")}
        />
        <input
          type="number"
          value={draft.totalPages}
          min="0"
          onChange={(event) => setDraft((prev) => ({ ...prev, totalPages: event.target.value }))}
          placeholder={tr(language, "books.totalPages")}
        />
        <input
          type="url"
          value={draft.coverUrl}
          onChange={(event) => setDraft((prev) => ({ ...prev, coverUrl: event.target.value }))}
          placeholder={tr(language, "books.coverUrl")}
        />
      </div>

      <div className="books-inline-status">
        {(["want_to_read", "reading", "finished"] as BookStatus[]).map((status) => (
          <button
            key={status}
            type="button"
            className={`chip chip-outline ${draft.status === status ? "active" : ""}`}
            onClick={() => setDraft((prev) => ({ ...prev, status }))}
          >
            {tr(language, `books.status.${status}`)}
          </button>
        ))}
      </div>

      <div className="books-inline-actions">
        <button type="submit" className="primary" disabled={!draft.title.trim()}>
          {tr(language, "books.add")}
        </button>
      </div>
    </form>
  );
}
