import { useCallback } from "react";
import { AppTab } from "../navigation";
import { SearchResultItem } from "../types/search";

type UseHeaderSearchNavigationParams = {
    setSelectedWeek: (week: number) => void;
    setSelectedDate: (date: string) => void;
    setActiveTab: (tab: AppTab) => void;
    setSearchQuery: (value: string) => void;
};

export function useHeaderSearchNavigation({
    setSelectedWeek,
    setSelectedDate,
    setActiveTab,
    setSearchQuery
}: UseHeaderSearchNavigationParams) {
    return useCallback((result: SearchResultItem) => {
        if (result.week) {
            setSelectedWeek(result.week);
            setActiveTab("week");
        } else if (result.date) {
            setSelectedDate(result.date);
            setActiveTab("today");
        }
        setSearchQuery("");
    }, [setActiveTab, setSearchQuery, setSelectedDate, setSelectedWeek]);
}
