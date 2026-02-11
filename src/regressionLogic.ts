import { addDays, parseIso } from "./utils";

export type BlockCompletionState = {
    plannedAmount: number;
    usesCounter: boolean;
    actualValue: number;
    sliderValue: number;
    isDone: boolean;
};

export function getBlockCompletionState(input: {
    amount?: number;
    actual?: unknown;
    done?: unknown;
}): BlockCompletionState {
    const plannedAmount = Math.max(0, Math.floor(input.amount ?? 0));
    const usesCounter = plannedAmount > 1;
    const numericActual = typeof input.actual === "number" && Number.isFinite(input.actual)
        ? input.actual
        : 0;
    const actualValue = Math.max(0, Math.floor(numericActual));
    const sliderValue = usesCounter ? Math.min(actualValue, plannedAmount) : 0;
    const doneValue = input.done;
    const normalizedDone = doneValue === true || doneValue === "true" || doneValue === 1 || doneValue === "1";
    const isDone = usesCounter ? sliderValue >= plannedAmount : normalizedDone;

    return {
        plannedAmount,
        usesCounter,
        actualValue,
        sliderValue,
        isDone
    };
}

export function toggleHabitLogEntry(
    prev: Record<string, string[]>,
    date: string,
    habitId: string
): Record<string, string[]> {
    const log = prev[date] ?? [];
    const isCompleted = log.includes(habitId);
    const nextForDate = isCompleted
        ? log.filter((id) => id !== habitId)
        : [...log, habitId];

    if (nextForDate.length === 0) {
        const next = { ...prev };
        delete next[date];
        return next;
    }

    return {
        ...prev,
        [date]: nextForDate
    };
}

export function canToggleHabitOnDate(input: {
    readOnly: boolean;
    date: string;
    today: string;
    habitStartDate: string;
}): boolean {
    return canToggleHabitCell({
        ...input,
        isPlanned: true
    });
}

export function canToggleHabitCell(input: {
    readOnly: boolean;
    date: string;
    today: string;
    habitStartDate: string;
    isPlanned: boolean;
}): boolean {
    if (input.readOnly) return false;
    if (!input.isPlanned) return false;
    if (input.date > input.today) return false;
    if (input.date < input.habitStartDate) return false;
    return true;
}

export type HabitCellVisualState = "done" | "missed" | "inactive";

export function getHabitCellVisualState(input: {
    isDone: boolean;
    isPlanned: boolean;
}): HabitCellVisualState {
    if (input.isDone) return "done";
    if (input.isPlanned) return "missed";
    return "inactive";
}

export function getGoalWeekChipClass(weekData?: { done: number; target: number }): "empty" | "high" | "mid" | "low" | "zero" {
    if (!weekData) return "empty";
    if (weekData.target <= 0) return "zero";

    const percent = Math.round((weekData.done / weekData.target) * 100);
    if (percent >= 80) return "high";
    if (percent >= 50) return "mid";
    if (percent > 0) return "low";
    return "zero";
}

export function canReorderIndices(input: {
    fromIndex: number;
    toIndex: number;
    length: number;
}): boolean {
    const { fromIndex, toIndex, length } = input;
    if (!Number.isInteger(fromIndex) || !Number.isInteger(toIndex) || !Number.isInteger(length)) return false;
    if (length <= 0) return false;
    if (fromIndex < 0 || toIndex < 0) return false;
    if (fromIndex >= length || toIndex >= length) return false;
    if (fromIndex === toIndex) return false;
    return true;
}

export type ExpandedHabitDateWindow = {
    startDate: string;
    endDate: string;
    dates: string[];
    startOffset: number;
};

export function getExpandedHabitDateWindow(input: {
    today: string;
    habitStartDate: string;
    windowDays?: number;
}): ExpandedHabitDateWindow {
    const windowDays = Math.max(1, Math.floor(input.windowDays ?? 28));
    const endDate = input.today;
    const defaultStart = addDays(endDate, -(windowDays - 1));
    const startDate = input.habitStartDate > defaultStart ? input.habitStartDate : defaultStart;

    if (startDate > endDate) {
        return {
            startDate,
            endDate,
            dates: [],
            startOffset: 0
        };
    }

    const dates: string[] = [];
    let cursor = startDate;
    let guard = 0;
    const maxDays = windowDays + 7;

    while (cursor <= endDate && guard < maxDays) {
        dates.push(cursor);
        cursor = addDays(cursor, 1);
        guard += 1;
    }

    const startOffset = (parseIso(startDate).getDay() + 6) % 7;
    return {
        startDate,
        endDate,
        dates,
        startOffset
    };
}
