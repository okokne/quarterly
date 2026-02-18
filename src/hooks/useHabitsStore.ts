import { useCallback, useEffect, useState } from "react";
import { Cycle, Habit, HABITS_STORAGE_KEY, HABIT_LOG_STORAGE_KEY, Id, StorageScope } from "../types";
import { parseIso, toIsoDate } from "../utils";
import { toggleHabitLogEntry } from "../regressionLogic";
import { readScopedStorageValue, writeScopedStorageValue } from "../persistence/storageScope";

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
    storageScope: StorageScope;
};

export function useHabitsStore({ activeCycle, isArchiveView, storageScope }: UseHabitsStoreParams) {
    const [habits, setHabits] = useState<Habit[]>(() =>
        parseStored<Habit[]>(readScopedStorageValue(HABITS_STORAGE_KEY, storageScope), [])
    );
    const [habitLog, setHabitLog] = useState<Record<string, string[]>>(() =>
        parseStored<Record<string, string[]>>(readScopedStorageValue(HABIT_LOG_STORAGE_KEY, storageScope), {})
    );

    useEffect(() => {
        try {
            writeScopedStorageValue(HABITS_STORAGE_KEY, storageScope, JSON.stringify(habits));
        } catch (err) {
            console.error("Failed to persist habits:", err);
        }
    }, [habits, storageScope]);

    useEffect(() => {
        try {
            writeScopedStorageValue(HABIT_LOG_STORAGE_KEY, storageScope, JSON.stringify(habitLog));
        } catch (err) {
            console.error("Failed to persist habit log:", err);
        }
    }, [habitLog, storageScope]);

    useEffect(() => {
        const today = toIsoDate(new Date());
        const knownHabitIds = new Set(habits.map((habit) => String(habit.id)));
        setHabitLog((prev) => {
            let changed = false;
            const next: Record<string, string[]> = {};

            Object.entries(prev).forEach(([date, ids]) => {
                if (date > today) {
                    changed = true;
                    return;
                }

                const filteredIds = ids.filter((id) => knownHabitIds.has(String(id)));
                const uniqueIds = Array.from(new Set(filteredIds));
                if (uniqueIds.length === 0) {
                    if (ids.length > 0) changed = true;
                    return;
                }

                if (
                    uniqueIds.length !== ids.length
                    || uniqueIds.some((id, index) => id !== ids[index])
                ) {
                    changed = true;
                }
                next[date] = uniqueIds;
            });

            return changed ? next : prev;
        });
    }, [habits]);

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
        if (date > toIsoDate(new Date())) return;
        setHabitLog((prev) => toggleHabitLogEntry(prev, date, habitId));
    }, [isArchiveView]);
    const deleteHabit = useCallback((habitId: Id) => {
        if (isArchiveView) return;
        setHabits((prev) => prev.filter((habit) => habit.id !== habitId));
        setHabitLog((prev) => {
            const next: Record<string, string[]> = {};
            Object.entries(prev).forEach(([date, ids]) => {
                const filtered = ids.filter((id) => id !== habitId);
                if (filtered.length > 0) next[date] = filtered;
            });
            return next;
        });
    }, [isArchiveView]);

    return {
        habits,
        setHabits,
        habitLog,
        setHabitLog,
        getActiveHabitsForDate,
        toggleHabit,
        deleteHabit
    };
}
