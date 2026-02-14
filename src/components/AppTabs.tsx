import { BarChart3, CalendarDays, BookOpenText, LayoutGrid } from "lucide-react";
import { t as tr } from "../i18n";
import { AppLanguage } from "../types";
import { Icon } from "./ui/Icon";

export type AppTab = "today" | "week" | "stats" | "journal";

type AppTabsProps = {
    language: AppLanguage;
    activeTab: AppTab;
    setActiveTab: (tab: AppTab) => void;
};

export function AppTabs({ language, activeTab, setActiveTab }: AppTabsProps) {
    return (
        <nav className="tabs">
            <button className={activeTab === "today" ? "active" : ""} onClick={() => setActiveTab("today")}>
                <Icon icon={CalendarDays} className="tab-icon" />
                {tr(language, "tabs.today")}
            </button>
            <button className={activeTab === "week" ? "active" : ""} onClick={() => setActiveTab("week")}>
                <Icon icon={LayoutGrid} className="tab-icon" />
                {tr(language, "tabs.week")}
            </button>
            <button className={activeTab === "stats" ? "active" : ""} onClick={() => setActiveTab("stats")}>
                <Icon icon={BarChart3} className="tab-icon" />
                {tr(language, "tabs.stats")}
            </button>
            <button className={activeTab === "journal" ? "active" : ""} onClick={() => setActiveTab("journal")}>
                <Icon icon={BookOpenText} className="tab-icon" />
                {tr(language, "tabs.journal")}
            </button>
        </nav>
    );
}
