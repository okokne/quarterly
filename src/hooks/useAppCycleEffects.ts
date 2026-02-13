import { Dispatch, SetStateAction, useEffect } from "react";
import { Cycle, Id, LEGACY_KEY } from "../types";
import { addDays, getWeekIndexForDate, toIsoDate } from "../utils";

type OnboardingStep = 1 | 2 | 3 | 4;

type UseAppCycleEffectsParams = {
    cycle: Cycle | null;
    viewingArchiveId: Id | null;
    step: OnboardingStep;
    setStep: Dispatch<SetStateAction<OnboardingStep>>;
    setSelectedWeek: Dispatch<SetStateAction<number>>;
    setSelectedDate: Dispatch<SetStateAction<string>>;
    setShowLegacyPrompt: Dispatch<SetStateAction<boolean>>;
    setShowCycleEndPrompt: Dispatch<SetStateAction<boolean>>;
};

export function useAppCycleEffects({
    cycle,
    viewingArchiveId,
    step,
    setStep,
    setSelectedWeek,
    setSelectedDate,
    setShowLegacyPrompt,
    setShowCycleEndPrompt
}: UseAppCycleEffectsParams) {
    useEffect(() => {
        if (!cycle) return;
        const today = toIsoDate(new Date());
        const weekIndex = getWeekIndexForDate(cycle, today);
        setSelectedWeek(weekIndex);
        const currentWeek = cycle.weeks.find((week) => week.index === weekIndex);
        if (!currentWeek) return;
        const firstDay = currentWeek.startDate;
        const lastDay = currentWeek.endDate;
        if (today < firstDay || today > lastDay) {
            setSelectedDate(firstDay);
            return;
        }
        setSelectedDate(today);
    }, [cycle?.id, setSelectedDate, setSelectedWeek]);

    useEffect(() => {
        if (!cycle) return;
        if (cycle.goals.length > 0 && step < 4) setStep(4);
    }, [cycle?.id, cycle?.goals.length, step, setStep]);

    useEffect(() => {
        if (cycle) return;
        const legacy = localStorage.getItem(LEGACY_KEY);
        if (legacy) setShowLegacyPrompt(true);
    }, [cycle, setShowLegacyPrompt]);

    useEffect(() => {
        if (!cycle || !cycle.startDate) return;
        try {
            const endDate = addDays(cycle.startDate, 83);
            const today = toIsoDate(new Date());
            if (today >= endDate && !viewingArchiveId && !cycle.finalReview) {
                setShowCycleEndPrompt(true);
            }
        } catch (error) {
            console.error("Date calc error", error);
        }
    }, [cycle, viewingArchiveId, setShowCycleEndPrompt]);
}
