import { useEffect, useRef, useState } from "react";
import { CloudAlert, CloudCheck, CloudOff, FolderKanban, Search, Settings } from "lucide-react";
import { t as tr } from "../i18n";
import { AppLanguage, DateFormat, SyncStatus, Week } from "../types";
import { formatDate, formatRange } from "../utils";
import { ProgressRing } from "./ProgressRing";
import { Icon } from "./ui/Icon";

type AppHeaderProps = {
    title?: string;
    startDate: string;
    currentWeekIndex: number;
    currentWeek: Week;
    language: AppLanguage;
    dateFormat: DateFormat;
    onOpenCycleDrawer: () => void;
    onOpenSearch: () => void;
    onOpenSettings: () => void;
    onOpenSyncStatus: () => void;
    weekCompletion: { percent: number; targetCount: number };
    syncStatus?: SyncStatus;
};

export function AppHeader({
    title,
    startDate,
    currentWeekIndex,
    currentWeek,
    language,
    dateFormat,
    onOpenCycleDrawer,
    onOpenSearch,
    onOpenSettings,
    onOpenSyncStatus,
    weekCompletion,
    syncStatus
}: AppHeaderProps) {
    const [showWeekProgressInfo, setShowWeekProgressInfo] = useState(false);
    const weekProgressRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!showWeekProgressInfo) return;
        const onPointerDown = (event: MouseEvent) => {
            if (!weekProgressRef.current?.contains(event.target as Node)) {
                setShowWeekProgressInfo(false);
            }
        };
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setShowWeekProgressInfo(false);
            }
        };
        document.addEventListener("mousedown", onPointerDown);
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("mousedown", onPointerDown);
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [showWeekProgressInfo]);

    const syncLabel = syncStatus === "syncing"
        ? tr(language, "app.syncBadgeSyncing")
        : syncStatus === "synced"
            ? tr(language, "app.syncBadgeSaved")
            : syncStatus === "error"
                ? tr(language, "app.syncBadgeProblem")
                : syncStatus === "offline"
                    ? tr(language, "app.syncBadgeOffline")
                    : tr(language, "app.syncBadgeSaved");
    const weekProgressTitle = weekCompletion.targetCount > 0
        ? tr(language, "today.weekProgress")
        : tr(language, "week.noWeeklyTargets");
    const syncIcon = syncStatus === "syncing"
        ? CloudCheck
        : syncStatus === "synced"
            ? CloudCheck
            : syncStatus === "error"
                ? CloudAlert
                : syncStatus === "offline"
                    ? CloudOff
                    : CloudCheck;

    return (
        <header className="header">
            <div className="header-main">
                <div>
                    <button className="header-cycle-trigger" onClick={onOpenCycleDrawer}>
                        <p className="eyebrow">Quarterly</p>
                        <h1>{title ?? "Quarterly"}</h1>
                    </button>
                    <p className="muted">{tr(language, "app.brandTagline")}</p>
                    <p className="muted">{tr(language, "app.headerStartWeek", {
                        date: formatDate(startDate, dateFormat, language),
                        week: currentWeekIndex,
                        range: formatRange(currentWeek.startDate, currentWeek.endDate, dateFormat, language)
                    })}</p>
                </div>
            </div>
            <div className="header-side">
                <div className="header-week-progress" title={weekProgressTitle} ref={weekProgressRef}>
                        <ProgressRing value={weekCompletion.percent} max={100} size={92} strokeWidth={8} />
                        <div className="header-week-progress-meta">
                            <div className="header-week-progress-meta-top">
                                <strong>{tr(language, "app.headerWeekShort", { week: currentWeekIndex })}</strong>
                                <button
                                    type="button"
                                    className="header-week-progress-info-btn"
                                    aria-label={tr(language, "app.weekProgressInfoLabel")}
                                    title={tr(language, "app.weekProgressInfoLabel")}
                                    onClick={() => setShowWeekProgressInfo((prev) => !prev)}
                                >
                                    i
                                </button>
                            </div>
                            {showWeekProgressInfo && (
                                <div className="header-week-progress-popover" role="dialog">
                                    {tr(language, "app.weekProgressInfoText")}
                                </div>
                            )}
                        </div>
                    </div>
                <div className="header-actions">
                    <button
                        onClick={onOpenCycleDrawer}
                        title={tr(language, "app.openCycleDrawer")}
                        className="icon-btn header-cycle-btn"
                    >
                        <Icon icon={FolderKanban} />
                        <span className="header-cycle-btn-text">
                            <strong>{tr(language, "app.cycleLabel")}</strong>
                            <em>{tr(language, "app.myQuarterContext", { week: currentWeekIndex, remaining: Math.max(0, 12 - currentWeekIndex) })}</em>
                        </span>
                    </button>
                    <button
                        onClick={onOpenSearch}
                        title={tr(language, "app.searchTitle")}
                        className="icon-btn"
                    >
                        <Icon icon={Search} />
                    </button>
                    {syncStatus && (
                        <button
                            type="button"
                            className={`sync-status sync-status-button ${syncStatus}`}
                            onClick={onOpenSyncStatus}
                            title={tr(language, "app.openSyncStatus")}
                        >
                            <Icon icon={syncIcon} size={14} className="sync-status-icon" />
                            {syncLabel}
                        </button>
                    )}
                    <button
                        onClick={onOpenSettings}
                        title={tr(language, "common.settings")}
                        className="icon-btn"
                    >
                        <Icon icon={Settings} />
                    </button>
                </div>
            </div>
        </header>
    );
}
