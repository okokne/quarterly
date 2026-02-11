import { useCallback, useEffect, useState } from "react";
import { Cycle, Habit, HABITS_STORAGE_KEY, HABIT_LOG_STORAGE_KEY, Id } from "../types";
import { parseIso } from "../utils";
import { toggleHabitLogEntry } from "../regressionLogic";

function parseStored<T>(raw: string | null, fallback: T): T {
    if (!raw) return fallback;
    try {
        return JSON.parse(raw) as T;
    } catch {
        return fallback;
    }
}

type UseHabitsStoreParams = {
    activeCycle: Cycle | null;
    isArchiveView: boolean;
};

export function useHabitsStore({ activeCycle, isArchiveView }: UseHabitsStoreParams) {
    const [habits, setHabits] = useState<Habit[]>(() =>
        parseStored<Habit[]>(localStorage.getItem(HABITS_STORAGE_KEY), [])
    );
    const [habitLog, setHabitLog] = useState<Record<string, string[]>>(() =>
        parseStored<Record<string, string[]>>(localStorage.getItem(HABIT_LOG_STORAGE_KEY), {})
    );

    useEffect(() => {
        try {
            localStorage.setItem(HABITS_STORAGE_KEY, JSON.stringify(habits));
        } catch (err) {
            console.error("Failed to persist habits:", err);
        }
    }, [habits]);

    useEffect(() => {
        try {
            localStorage.setItem(HABIT_LOG_STORAGE_KEY, JSON.stringify(habitLog));
        } catch (err) {
            console.error("Failed to persist habit log:", err);
        }
    }, [habitLog]);

    // One-time per cycle migration: old cycle-scoped habits -> global store.
    useEffect(() => {
        if (!activeCycle) return;

        setHabits((prev) => {
            if (prev.length === 0 && activeCycle.habits.length > 0) {
                return activeCycle.habits;
            }
            return prev;
        });

        setHabitLog((prev) => {
            if (Object.keys(prev).length === 0 && Object.keys(activeCycle.habitLog).length > 0) {
                return activeCycle.habitLog;
            }
            return prev;
        });
    }, [activeCycle?.id]);

    const getActiveHabitsForDate = useCallback((date: string): Habit[] => {
        const dayOfWeek = parseIso(date).getDay(); // 0=Sun..6=Sat
        return habits.filter((habit) => {
            if (habit.startedAt && date < habit.startedAt) return false;
            if (habit.frequency === "daily") return true;
            if (habit.frequency === "weekdays") return dayOfWeek >= 1 && dayOfWeek <= 5;
            if (Array.isArray(habit.frequency)) return habit.frequency.includes(dayOfWeek);
            return false;
        });
    }, [habits]);

    const toggleHabit = useCallback((date: string, habitId: Id) => {
        if (isArchiveView) return;
        setHabitLog((prev) => toggleHabitLogEntry(prev, date, habitId));
    }, [isArchiveView]);

    return {
        habits,
        setHabits,
        habitLog,
        setHabitLog,
        getActiveHabitsForDate,
        toggleHabit
    };
}
