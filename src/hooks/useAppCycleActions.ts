import { Dispatch, SetStateAction, useCallback } from "react";
import { buildCycle, buildDemoCycle } from "../utils";
import { Cycle, CycleAction, Id, LEGACY_KEY } from "../types";
import { GoogleCalendar } from "../googleCalendar";

type UseAppCycleActionsParams = {
    activeCycle: Cycle | null;
    googleConnected: boolean;
    titleInput: string;
    startDateInput: string;
    setHistory: Dispatch<SetStateAction<Cycle[]>>;
    dispatch: Dispatch<CycleAction>;
    setStep: Dispatch<SetStateAction<1 | 2 | 3 | 4>>;
    setActiveTab: Dispatch<SetStateAction<"today" | "week" | "stats" | "journal">>;
    setSelectedWeek: Dispatch<SetStateAction<number>>;
    setSelectedDate: Dispatch<SetStateAction<string>>;
    setCalendarList: Dispatch<SetStateAction<GoogleCalendar[]>>;
    setShowLegacyPrompt: Dispatch<SetStateAction<boolean>>;
    setShowArchiveDeleteConfirm: Dispatch<SetStateAction<Id | null>>;
};

export function useAppCycleActions({
    activeCycle,
    googleConnected,
    titleInput,
    startDateInput,
    setHistory,
    dispatch,
    setStep,
    setActiveTab,
    setSelectedWeek,
    setSelectedDate,
    setCalendarList,
    setShowLegacyPrompt,
    setShowArchiveDeleteConfirm
}: UseAppCycleActionsParams) {
    const handleLoadDemo = useCallback(() => {
        const demo = buildDemoCycle();
        dispatch({ type: "SET", payload: demo });
        setActiveTab("today");
        setSelectedWeek(1);
        setSelectedDate(demo.weeks[0].startDate);
    }, [dispatch, setActiveTab, setSelectedDate, setSelectedWeek]);

    const handleCreateCycle = useCallback(() => {
        dispatch({ type: "SET", payload: buildCycle(titleInput, startDateInput) });
    }, [dispatch, startDateInput, titleInput]);

    const handleArchiveCycle = useCallback(() => {
        if (!activeCycle) return;
        const archivedCycle = { ...activeCycle };
        setHistory((prev) => [...prev, archivedCycle]);
        dispatch({ type: "SET", payload: null });
        setStep(1);
        if (googleConnected) {
            setCalendarList([]);
        }
    }, [activeCycle, dispatch, googleConnected, setCalendarList, setHistory, setStep]);

    const handleResetLegacy = useCallback(() => {
        localStorage.removeItem(LEGACY_KEY);
        setShowLegacyPrompt(false);
    }, [setShowLegacyPrompt]);

    const handleDeleteFromHistory = useCallback((id: Id) => {
        setHistory((prev) => prev.filter((cycle) => cycle.id !== id));
        setShowArchiveDeleteConfirm(null);
    }, [setHistory, setShowArchiveDeleteConfirm]);

    return {
        handleLoadDemo,
        handleCreateCycle,
        handleArchiveCycle,
        handleResetLegacy,
        handleDeleteFromHistory
    };
}
