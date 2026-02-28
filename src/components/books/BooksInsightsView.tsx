import { AppLanguage } from "../../types";
import { t as tr } from "../../i18n";
import { BooksDashboardMetrics } from "../../hooks/useBooksDashboard";

type BooksInsightsViewProps = {
  language: AppLanguage;
  metrics: BooksDashboardMetrics;
};

function formatMinutes(language: AppLanguage, minutes: number): string {
  if (minutes < 60) return tr(language, "books.minutesValueMinutes", { value: minutes });
  const hours = Math.floor(minutes / 60);
  const restMinutes = minutes % 60;
  if (restMinutes === 0) {
    return tr(language, "books.minutesValueHoursOnly", { hours });
  }
  return tr(language, "books.minutesValueHoursMinutes", { hours, minutes: restMinutes });
}

export function BooksInsightsView({ language, metrics }: BooksInsightsViewProps) {
  return (
    <div className="books-layout-stack">
      <div className="books-insights-header">
        <h3>{tr(language, "books.view.insights")}</h3>
        <p className="muted">{tr(language, "books.insightsHint")}</p>
      </div>

      <div className="books-summary-grid">
        <article className="books-summary-card">
          <span>{tr(language, "books.streak")}</span>
          <strong>{metrics.streakDays}</strong>
        </article>
        <article className="books-summary-card">
          <span>{tr(language, "books.pagesThisWeek")}</span>
          <strong>{metrics.pagesThisWeek}</strong>
        </article>
        <article className="books-summary-card">
          <span>{tr(language, "books.booksThisYear")}</span>
          <strong>{metrics.booksThisYear}</strong>
        </article>
        <article className="books-summary-card">
          <span>{tr(language, "books.summary.remainingPages")}</span>
          <strong>{metrics.totalRemainingPages}</strong>
        </article>
        <article className="books-summary-card books-summary-card-dual">
          <div>
            <span>{tr(language, "books.minutesThisWeek")}</span>
            <strong>{formatMinutes(language, metrics.minutesThisWeek)}</strong>
          </div>
          <div>
            <span>{tr(language, "books.minutesThisYear")}</span>
            <strong>{formatMinutes(language, metrics.minutesThisYear)}</strong>
          </div>
        </article>
        <article className="books-summary-card">
          <span>{tr(language, "books.minutesTotal")}</span>
          <strong>{formatMinutes(language, metrics.minutesTotal)}</strong>
        </article>
        <article className="books-summary-card">
          <span>{tr(language, "books.avgMinutesPerSession")}</span>
          <strong>{formatMinutes(language, metrics.avgMinutesPerSession)}</strong>
        </article>
        <article className="books-summary-card">
          <span>{tr(language, "books.sessionsLogged")}</span>
          <strong>{metrics.totalSessions}</strong>
        </article>
      </div>
    </div>
  );
}
