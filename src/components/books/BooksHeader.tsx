import { AppLanguage } from "../../types";
import { t as tr } from "../../i18n";
import { Plus } from "../ui/icons";

export type BooksView = "library" | "insights";

type BooksHeaderProps = {
  language: AppLanguage;
  activeView: BooksView;
  composerOpen: boolean;
  onToggleComposer: () => void;
  onChangeView: (view: BooksView) => void;
};

export function BooksHeader({
  language,
  activeView,
  composerOpen,
  onToggleComposer,
  onChangeView,
}: BooksHeaderProps) {
  return (
    <>
      <div className="books-header-row">
        <h2 className="books-tab-title">{tr(language, "books.title")}</h2>
        {activeView === "library" && (
          <button
            type="button"
            className={`glass-button books-add-toggle ${composerOpen ? "open" : ""}`}
            onClick={onToggleComposer}
            aria-expanded={composerOpen}
          >
            <span className="books-add-toggle-icon" aria-hidden="true">
              <Plus size={15} />
            </span>
            <span>{composerOpen ? tr(language, "common.close") : tr(language, "books.add")}</span>
          </button>
        )}
      </div>

      <div className="books-view-toggle">
        <button
          type="button"
          className={`books-view-chip ${activeView === "library" ? "active" : ""}`}
          onClick={() => onChangeView("library")}
        >
          {tr(language, "books.view.library")}
        </button>
        <button
          type="button"
          className={`books-view-chip ${activeView === "insights" ? "active" : ""}`}
          onClick={() => onChangeView("insights")}
        >
          {tr(language, "books.view.insights")}
        </button>
      </div>
    </>
  );
}
