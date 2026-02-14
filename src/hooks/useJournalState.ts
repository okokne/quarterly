import { useMemo, useState } from "react";
import { Cycle, ReviewSignal } from "../types";
import { getWeekIndexForDate, toIsoDate } from "../utils";
import { ComposerType, FeedRangeFilter, FeedTypeFilter, FilterOption } from "../components/journal/types";

type UseJournalStateParams = {
    cycle: Cycle;
};

export function useJournalState({ cycle }: UseJournalStateParams) {
    const today = toIsoDate(new Date());

    const [showComposer, setShowComposer] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [composerType, setComposerType] = useState<ComposerType>("custom");

    const [customDate, setCustomDate] = useState(() => toIsoDate(new Date()));
    const [customTitle, setCustomTitle] = useState("");
    const [customContent, setCustomContent] = useState("");
    const [customSignals, setCustomSignals] = useState<ReviewSignal[]>([]);

    const [dailyDate, setDailyDate] = useState(() => toIsoDate(new Date()));
    const [dailyGood, setDailyGood] = useState("");
    const [dailyBad, setDailyBad] = useState("");

    const [weeklyWeek, setWeeklyWeek] = useState(() => String(Math.max(1, getWeekIndexForDate(cycle, today))));
    const [weeklyGood, setWeeklyGood] = useState("");
    const [weeklyBad, setWeeklyBad] = useState("");
    const [weeklyChange, setWeeklyChange] = useState("");

    const [searchQuery, setSearchQuery] = useState("");
    const [typeFilter, setTypeFilter] = useState<FeedTypeFilter>("all");
    const [signalFilter, setSignalFilter] = useState<ReviewSignal[]>([]);
    const [rangeFilter, setRangeFilter] = useState<FeedRangeFilter>("all");
    const [contextFilter, setContextFilter] = useState<string[]>([]);
    const [openMonths, setOpenMonths] = useState<Record<string, boolean>>({});

    const toggleSignalSelection = (signal: ReviewSignal) => {
        setSignalFilter((prev) => (
            prev.includes(signal)
                ? prev.filter((item) => item !== signal)
                : [...prev, signal]
        ));
    };

    const toggleCustomSignal = (signal: ReviewSignal) => {
        setCustomSignals((prev) => (
            prev.includes(signal)
                ? prev.filter((item) => item !== signal)
                : [...prev, signal]
        ));
    };

    const toggleContextSelection = (contextId: string) => {
        setContextFilter((prev) => (
            prev.includes(contextId)
                ? prev.filter((item) => item !== contextId)
                : [...prev, contextId]
        ));
    };

    const resetComposerFields = () => {
        setCustomDate(toIsoDate(new Date()));
        setCustomTitle("");
        setCustomContent("");
        setCustomSignals([]);
        setDailyDate(toIsoDate(new Date()));
        setDailyGood("");
        setDailyBad("");
        setWeeklyGood("");
        setWeeklyBad("");
        setWeeklyChange("");
    };

    const composerSubmitDisabled = useMemo(() => {
        if (composerType === "custom") {
            return !customTitle.trim() && !customContent.trim();
        }
        if (composerType === "daily") {
            return !dailyGood.trim() && !dailyBad.trim();
        }
        return !weeklyGood.trim() && !weeklyBad.trim() && !weeklyChange.trim();
    }, [composerType, customContent, customTitle, dailyBad, dailyGood, weeklyBad, weeklyChange, weeklyGood]);

    const typeOptions: Array<FilterOption<FeedTypeFilter>> = [
        { id: "all", labelKey: "journal.filterTypeAll" },
        { id: "daily", labelKey: "journal.filterTypeDaily" },
        { id: "weekly", labelKey: "journal.filterTypeWeekly" },
        { id: "custom", labelKey: "journal.filterTypeCustom" },
        { id: "quick", labelKey: "journal.filterTypeQuick" }
    ];

    const signalOptions: Array<FilterOption<ReviewSignal>> = [
        { id: "win", labelKey: "journal.signalWin" },
        { id: "challenge", labelKey: "journal.signalChallenge" },
        { id: "next_step", labelKey: "journal.signalNextStep" },
        { id: "note", labelKey: "journal.signalNote" }
    ];

    const rangeOptions: Array<FilterOption<FeedRangeFilter>> = [
        { id: "all", labelKey: "journal.rangeAll" },
        { id: "current_week", labelKey: "journal.rangeCurrentWeek" },
        { id: "current_month", labelKey: "journal.rangeCurrentMonth" },
        { id: "quarter", labelKey: "journal.rangeQuarter" }
    ];

    return {
        today,
        showComposer,
        setShowComposer,
        showFilters,
        setShowFilters,
        composerType,
        setComposerType,
        customDate,
        setCustomDate,
        customTitle,
        setCustomTitle,
        customContent,
        setCustomContent,
        customSignals,
        toggleCustomSignal,
        dailyDate,
        setDailyDate,
        dailyGood,
        setDailyGood,
        dailyBad,
        setDailyBad,
        weeklyWeek,
        setWeeklyWeek,
        weeklyGood,
        setWeeklyGood,
        weeklyBad,
        setWeeklyBad,
        weeklyChange,
        setWeeklyChange,
        searchQuery,
        setSearchQuery,
        typeFilter,
        setTypeFilter,
        signalFilter,
        setSignalFilter,
        rangeFilter,
        setRangeFilter,
        contextFilter,
        setContextFilter,
        openMonths,
        setOpenMonths,
        toggleSignalSelection,
        toggleContextSelection,
        resetComposerFields,
        composerSubmitDisabled,
        typeOptions,
        signalOptions,
        rangeOptions
    };
}
