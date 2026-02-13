import { useMemo } from "react";
import { t as tr } from "../i18n";
import { AppLanguage, Cycle } from "../types";
import { SearchResultItem } from "../types/search";

type UseCycleSearchParams = {
    cycle: Cycle | null;
    searchQuery: string;
    language: AppLanguage;
};

export function useCycleSearch({ cycle, searchQuery, language }: UseCycleSearchParams) {
    return useMemo(() => {
        if (!searchQuery.trim() || !cycle) return [];

        const q = searchQuery.toLowerCase();
        const results: SearchResultItem[] = [];

        cycle.goals.forEach((goal) => {
            if (goal.title.toLowerCase().includes(q)) {
                results.push({ type: tr(language, "app.searchTypeGoal"), text: goal.title });
            }
        });

        Object.entries(cycle.weeklyTargets).forEach(([weekStr, targets]) => {
            targets.forEach((target) => {
                if (target.title.toLowerCase().includes(q) || target.notes?.toLowerCase().includes(q)) {
                    results.push({ type: tr(language, "app.searchTypeTarget"), text: target.title, week: Number(weekStr) });
                }
            });
        });

        Object.entries(cycle.dailyPlans).forEach(([date, blocks]) => {
            blocks.forEach((block) => {
                if (block.title.toLowerCase().includes(q)) {
                    results.push({ type: tr(language, "app.searchTypeBlock"), text: block.title, date });
                }
            });
        });

        return results.slice(0, 8);
    }, [searchQuery, cycle, language]);
}
