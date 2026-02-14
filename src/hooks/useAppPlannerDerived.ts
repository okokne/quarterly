import { Cycle } from "../types";
import { addDays, getCurrentWeekIndex, toIsoDate } from "../utils";

type WeekSlice = {
    index: number;
    startDate: string;
    endDate: string;
};

type UseAppPlannerDerivedParams = {
    cycle: Cycle | null;
    selectedWeek: number;
    selectedDate: string;
};

export function useAppPlannerDerived({ cycle, selectedWeek, selectedDate }: UseAppPlannerDerivedParams) {
    const today = toIsoDate(new Date());
    const todayWeekIndex = cycle ? getCurrentWeekIndex(cycle.startDate, today, cycle.weeks.length || 12) : selectedWeek;
    const fallbackWeek: WeekSlice = {
        index: todayWeekIndex,
        startDate: today,
        endDate: today
    };

    const currentWeek = cycle?.weeks.find((week) => week.index === todayWeekIndex) ?? fallbackWeek;
    const todayWeek = cycle?.weeks.find((week) => week.index === todayWeekIndex) ?? fallbackWeek;
    const selectedWeekTargets = cycle?.weeklyTargets[selectedWeek] ?? [];
    const totalWeeklyTargets = selectedWeekTargets;
    const dayBlocks = cycle?.dailyPlans[selectedDate] ?? [];
    const reminderDate = cycle ? addDays(todayWeek.startDate, cycle.reminder.dayOffset) : today;
    const showReminder = cycle ? cycle.reminder.enabled && today === reminderDate : false;

    return {
        today,
        fallbackWeek,
        currentWeek,
        todayWeekIndex,
        todayWeek,
        selectedWeekTargets,
        totalWeeklyTargets,
        dayBlocks,
        reminderDate,
        showReminder
    };
}
