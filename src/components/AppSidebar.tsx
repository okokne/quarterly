import { useEffect, useMemo, useRef, useState } from "react";
import { BarChart3, BookOpenText, CalendarDays, CheckSquare, CloudAlert, CloudCheck, CloudOff, FolderKanban, LayoutGrid, type LucideIcon, Plus, Settings, SquarePen } from "./ui/icons";
import { t as tr } from "../i18n";
import { AppTab } from "../navigation";
import { AppLanguage, SyncStatus } from "../types";
import { Icon } from "./ui/Icon";

type QuickCaptureAction = "block" | "note";

type AppSidebarProps = {
    language: AppLanguage;
    activeTab: AppTab;
    setActiveTab: (tab: AppTab) => void;
    syncEnabled: boolean;
    syncStatus?: SyncStatus;
    onOpenSettings: () => void;
    onOpenSyncStatus: () => void;
    onQuickCapture: (action: QuickCaptureAction) => void;
};

type SidebarNavItem = {
    id: AppTab;
    labelKey: string;
    icon: LucideIcon;
};

const SIDEBAR_NAV_ITEMS: SidebarNavItem[] = [
    { id: "today", labelKey: "sidebar.nav.today", icon: CalendarDays },
    { id: "week", labelKey: "sidebar.nav.week", icon: LayoutGrid },
    { id: "plan", labelKey: "sidebar.nav.plan", icon: FolderKanban },
    { id: "inbox", labelKey: "sidebar.nav.inbox", icon: BookOpenText },
    { id: "stats", labelKey: "sidebar.nav.stats", icon: BarChart3 }
];

export function AppSidebar({
    language,
    activeTab,
    setActiveTab,
    syncEnabled,
    syncStatus,
    onOpenSettings,
    onOpenSyncStatus,
    onQuickCapture
}: AppSidebarProps) {
    const [showQuickCaptureMenu, setShowQuickCaptureMenu] = useState(false);
    const quickCaptureRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!showQuickCaptureMenu) return;
        const onPointerDown = (event: MouseEvent) => {
            if (!quickCaptureRef.current?.contains(event.target as Node)) {
                setShowQuickCaptureMenu(false);
            }
        };
        document.addEventListener("mousedown", onPointerDown);
        return () => document.removeEventListener("mousedown", onPointerDown);
    }, [showQuickCaptureMenu]);

    const syncLabel = useMemo(() => {
        if (!syncEnabled) return tr(language, "app.syncLocal");
        if (syncStatus === "syncing") return tr(language, "app.syncBadgeSyncing");
        if (syncStatus === "error") return tr(language, "app.syncBadgeProblem");
        if (syncStatus === "offline") return tr(language, "app.syncBadgeOffline");
        return tr(language, "app.syncBadgeSaved");
    }, [language, syncEnabled, syncStatus]);

    const syncIcon = syncStatus === "syncing"
        ? CloudCheck
        : syncStatus === "error"
            ? CloudAlert
            : syncStatus === "offline"
                ? CloudOff
                : CloudCheck;

    return (
        <aside className="app-sidebar">
            <div className="app-sidebar-top">
                <div className="app-sidebar-brand">
                    <span className="app-sidebar-logo" aria-hidden="true">Q</span>
                    <div>
                        <strong>Quarterly</strong>
                        <span>{tr(language, "sidebar.subtitle")}</span>
                    </div>
                </div>

                <div className="app-sidebar-quick-shell" ref={quickCaptureRef}>
                    <button
                        type="button"
                        className="app-sidebar-quick-btn"
                        onClick={() => setShowQuickCaptureMenu((prev) => !prev)}
                    >
                        <Icon icon={Plus} size={14} />
                        {tr(language, "sidebar.quickCapture")}
                    </button>
                    {showQuickCaptureMenu && (
                        <div className="app-sidebar-quick-menu" role="menu" aria-label={tr(language, "sidebar.quickCapture")}>
                            <button
                                type="button"
                                className="app-sidebar-quick-menu-item"
                                onClick={() => {
                                    onQuickCapture("block");
                                    setShowQuickCaptureMenu(false);
                                }}
                            >
                                <Icon icon={CheckSquare} size={13} />
                                {tr(language, "sidebar.quick.block")}
                            </button>
                            <button
                                type="button"
                                className="app-sidebar-quick-menu-item"
                                onClick={() => {
                                    onQuickCapture("note");
                                    setShowQuickCaptureMenu(false);
                                }}
                            >
                                <Icon icon={SquarePen} size={13} />
                                {tr(language, "sidebar.quick.note")}
                            </button>
                        </div>
                    )}
                </div>

                <nav className="app-sidebar-nav" aria-label={tr(language, "sidebar.navAria")}>
                    {SIDEBAR_NAV_ITEMS.map((item) => (
                        <button
                            key={item.id}
                            type="button"
                            className={`app-sidebar-nav-item ${activeTab === item.id ? "active" : ""}`}
                            onClick={() => setActiveTab(item.id)}
                        >
                            <Icon icon={item.icon} size={15} />
                            <span>{tr(language, item.labelKey)}</span>
                        </button>
                    ))}
                </nav>
            </div>

            <div className="app-sidebar-bottom">
                <button type="button" className="app-sidebar-footer-btn" onClick={onOpenSettings}>
                    <Icon icon={Settings} size={14} />
                    <span>{tr(language, "common.settings")}</span>
                </button>
                <button type="button" className="app-sidebar-footer-btn" onClick={onOpenSyncStatus}>
                    <Icon icon={syncIcon} size={14} />
                    <span>{syncLabel}</span>
                </button>
            </div>
        </aside>
    );
}
