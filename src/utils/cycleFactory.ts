import { Cycle, Week } from "../types";
import { uid } from "./id";
import { addDays } from "./date";
import { DEFAULT_JOURNAL_CONTEXTS } from "./journalContexts";

export function buildCycle(title: string, startDateInput: string): Cycle {
    const startDate = startDateInput;
    const weeks: Week[] = Array.from({ length: 12 }, (_, index) => {
        const weekStart = addDays(startDate, index * 7);
        return {
            index: index + 1,
            startDate: weekStart,
            endDate: addDays(weekStart, 6)
        };
    });

    return {
        id: uid(),
        title: title.trim() || undefined,
        startDate: startDateInput,
        weeks,
        vision: "",
        goals: [],
        weeklyTargets: {},
        dailyPlans: {},
        dailyReviews: {},
        weeklyReviews: {},
        reviewEntries: [],
        finalReview: undefined,
        journalEntries: [],
        journalContexts: [...DEFAULT_JOURNAL_CONTEXTS],
        defaultJournalContextId: DEFAULT_JOURNAL_CONTEXTS[0]?.id,
        reminder: { enabled: true, dayOffset: 6, time: "08:00" },
        habits: [],
        habitLog: {}
    };
}
