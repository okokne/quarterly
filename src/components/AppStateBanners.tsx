import { t as tr } from "../i18n";
import { AppLanguage, DateFormat, Id, LocalSnapshotMeta } from "../types";
import { addDays, formatRange } from "../utils";

type AppStateBannersProps = {
    viewingArchiveId: Id | null;
    cycleTitle?: string;
    cycleStartDate: string;
    language: AppLanguage;
    dateFormat: DateFormat;
    onExitArchive: () => void;
    recoveryCandidate: LocalSnapshotMeta | null;
    onRestoreLatestSnapshot: () => void;
    onDismissRecovery: () => void;
    persistenceWarning: string | null;
    onClearPersistenceWarning: () => void;
    showQuarterReviewBanner: boolean;
    onStartQuarterReview: () => void;
};

export function AppStateBanners({
    viewingArchiveId,
    cycleTitle,
    cycleStartDate,
    language,
    dateFormat,
    onExitArchive,
    recoveryCandidate,
    onRestoreLatestSnapshot,
    onDismissRecovery,
    persistenceWarning,
    onClearPersistenceWarning,
    showQuarterReviewBanner,
    onStartQuarterReview
}: AppStateBannersProps) {
    return (
        <>
            {viewingArchiveId && (
                <div className="archive-banner">
                    <span>
                        {tr(language, "app.archiveBanner", {
                            title: cycleTitle ?? "",
                            range: formatRange(cycleStartDate, addDays(cycleStartDate, 84), dateFormat, language)
                        })}
                        {" · "}
                        {tr(language, "common.readOnly")}
                    </span>
                    <button onClick={onExitArchive}>{tr(language, "app.backToCurrent")}</button>
                </div>
            )}

            {recoveryCandidate && !viewingArchiveId && (
                <section className="banner safety-banner">
                    <span>
                        {tr(language, "app.recoveryBanner", { date: recoveryCandidate.createdAt.slice(0, 10) })}
                    </span>
                    <div className="banner-actions">
                        <button onClick={onRestoreLatestSnapshot}>{tr(language, "app.recoveryRestore")}</button>
                        <button onClick={onDismissRecovery}>{tr(language, "common.cancel")}</button>
                    </div>
                </section>
            )}

            {showQuarterReviewBanner && !viewingArchiveId && (
                <section className="banner">
                    <span>{tr(language, "app.quarterCompleteBanner")}</span>
                    <div className="banner-actions">
                        <button className="primary" onClick={onStartQuarterReview}>
                            {tr(language, "app.startQuarterReview")}
                        </button>
                    </div>
                </section>
            )}

            {persistenceWarning && (
                <section className="banner warning-banner">
                    <span>{persistenceWarning}</span>
                    <div className="banner-actions">
                        <button onClick={onClearPersistenceWarning}>{tr(language, "common.done")}</button>
                    </div>
                </section>
            )}
        </>
    );
}
