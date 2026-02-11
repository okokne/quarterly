import { t as tr } from "../i18n";
import { AppLanguage } from "../types";

export type AppTab = "today" | "week" | "stats" | "journal";

type AppTabsProps = {
    language: AppLanguage;
    activeTab: AppTab;
    setActiveTab: (tab: AppTab) => void;
};

export function AppTabs({ language, activeTab, setActiveTab }: AppTabsProps) {
    return (
        <nav className="tabs">
            <button className={activeTab === "today" ? "active" : ""} onClick={() => setActiveTab("today")}>{tr(language, "tabs.today")}</button>
            <button className={activeTab === "week" ? "active" : ""} onClick={() => setActiveTab("week")}>{tr(language, "tabs.week")}</button>
            <button className={activeTab === "stats" ? "active" : ""} onClick={() => setActiveTab("stats")}>{tr(language, "tabs.stats")}</button>
            <button className={activeTab === "journal" ? "active" : ""} onClick={() => setActiveTab("journal")}>{tr(language, "tabs.journal")}</button>
        </nav>
    );
}
