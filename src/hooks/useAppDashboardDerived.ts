import { Cycle, DailyReview, WeeklyReview, emptyDailyReview, emptyWeeklyReview } from "../types";
import { buildCycle } from "../utils";

type UseAppDashboardDerivedParams = {
    cycle: Cycle | null;
    activeCycle: Cycle | null;
    titleInput: string;
    startDateInput: string;
    selectedDate: string;
    selectedWeek: number;
    step: 1 | 2 | 3 | 4;
};

type UseAppDashboardDerivedResult = {
    dashboardCycle: Cycle;
    dailyReview: DailyReview;
    weeklyReview: WeeklyReview;
    onboardingGoalsComplete: boolean;
    onboardingDone: boolean;
};

export function useAppDashboardDerived({
    cycle,
    activeCycle,
    titleInput,
    startDateInput,
    selectedDate,
    selectedWeek,
    step
}: UseAppDashboardDerivedParams): UseAppDashboardDerivedResult {
    const dashboardCycle = cycle ?? activeCycle ?? buildCycle(titleInput.trim(), startDateInput);
    const dailyReview = dashboardCycle.dailyReviews[selectedDate] ?? emptyDailyReview;
    const weeklyReview = dashboardCycle.weeklyReviews[selectedWeek] ?? emptyWeeklyReview;
    const onboardingGoalsComplete = dashboardCycle.goals.length > 0;
    const onboardingDone = step >= 4;

    return {
        dashboardCycle,
        dailyReview,
        weeklyReview,
        onboardingGoalsComplete,
        onboardingDone
    };
}
