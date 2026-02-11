import { AppLanguage, Cycle, CycleState, CycleAction, Week, Goal, DailyBlock, Habit, STORAGE_KEY, DateFormat, TimeFormat } from "./types";
import type { Id } from "./types";

// ─── ID Generator ───
export function uid(): Id {
    return Math.random().toString(36).slice(2, 10);
}

// ─── Date Utilities ───
export function toIsoDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

export function parseIso(dateStr: string): Date {
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(y, m - 1, d);
}

export function addDays(dateStr: string, days: number): string {
    const date = parseIso(dateStr);
    date.setDate(date.getDate() + days);
    return toIsoDate(date);
}

export function formatDate(dateStr: string, fmt: DateFormat, language: AppLanguage = "de"): string {
    const months = language === "de"
        ? ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"]
        : ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const date = parseIso(dateStr);
    const day = String(date.getDate()).padStart(2, "0");
    const monthIndex = date.getMonth();
    const monthNum = String(monthIndex + 1).padStart(2, "0");
    const year = String(date.getFullYear());

    if (fmt === "eu_short") return `${day}.${monthNum}.${year}`;
    if (fmt === "eu_long") return `${day}. ${months[monthIndex]} ${year}`;
    return `${year}-${monthNum}-${day}`;
}

export function formatTime(timeStr: string, fmt: TimeFormat): string {
    if (fmt === "24h") return timeStr;
    const [hStr, mStr] = timeStr.split(":");
    const hours = Number(hStr);
    const minutes = mStr ?? "00";
    const suffix = hours >= 12 ? "PM" : "AM";
    const hour12 = hours % 12 === 0 ? 12 : hours % 12;
    return `${hour12}:${minutes} ${suffix}`;
}

export function formatDateEuropean(dateStr: string): string {
    return formatDate(dateStr, "eu_long");
}

export function formatRange(start: string, end: string, fmt: DateFormat = "eu_short", language: AppLanguage = "de"): string {
    const separator = language === "de" ? "bis" : "to";
    return `${formatDate(start, fmt, language)} ${separator} ${formatDate(end, fmt, language)}`;
}

export function weekdayLabel(dateStr: string, language: AppLanguage = "de"): string {
    const day = parseIso(dateStr).getDay(); // 0=So
    const labels = language === "de"
        ? ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"]
        : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return labels[day];
}

export function getWeekIndexForDate(cycle: Cycle, dateStr: string): number {
    const date = parseIso(dateStr);
    const start = parseIso(cycle.weeks[0].startDate);
    const diffDays = Math.floor((date.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
    const rawIndex = Math.floor(diffDays / 7) + 1;
    if (rawIndex < 1) return 1;
    if (rawIndex > 12) return 12;
    return rawIndex;
}

export function getDatesInWeek(week: Week): string[] {
    return Array.from({ length: 7 }, (_, i) => addDays(week.startDate, i));
}

export function clamp(n: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, n));
}

// ─── Persistence ───
export function loadCycle(): Cycle | null {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
        return JSON.parse(raw) as Cycle;
    } catch {
        return null;
    }
}

export function saveCycle(cycle: Cycle | null): void {
    if (!cycle) return;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cycle));
    } catch (err) {
        console.error("Failed to persist cycle:", err);
    }
}

// ─── Cycle Builders ───
export function buildCycle(title: string, startDateInput: string): Cycle {
    const startDate = startDateInput;
    const weeks: Week[] = Array.from({ length: 12 }, (_, i) => {
        const weekStart = addDays(startDate, i * 7);
        return {
            index: i + 1,
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
        finalReview: undefined,
        journalEntries: [],
        reminder: { enabled: true, dayOffset: 6, time: "08:00" },
        habits: [],
        habitLog: {}
    };
}

export function buildDemoCycle(): Cycle {
    const today = toIsoDate(new Date());
    const cycle = buildCycle("Demo‑Plan: Quarterly", today);
    cycle.vision = "In drei Jahren lebe ich gesund, ausgeglichen und habe ein profitables, stabiles Business.";

    const g1: Goal = { id: uid(), title: "Am Ende der 12 Wochen wiege ich 84 kg (aktuell 89 kg).", metric: "84 kg" };
    const g2: Goal = { id: uid(), title: "50.000 € Umsatz generieren durch Neukunden.", metric: "50.000 €" };
    const g3: Goal = { id: uid(), title: "Beziehung stärken (wöchentliche Date Night).", metric: "1x/Woche" };
    cycle.goals = [g1, g2, g3];

    // Week 1 targets
    const t1_calls = { id: uid(), title: "Kaltakquise‑Anrufe", target: 50, unit: "Calls", done: 45 };
    const t1_sport = { id: uid(), title: "Sport", target: 5, unit: "Sessions", done: 5 };
    const t1_med = { id: uid(), title: "Meditation", target: 7, unit: "Tage", done: 6 };
    const t1_date = { id: uid(), title: "Date Night", target: 1, unit: "Abend", done: 1 };

    // Week 2 targets  
    const t2_calls = { id: uid(), title: "Kaltakquise‑Anrufe", target: 50, unit: "Calls", done: 38 };
    const t2_sport = { id: uid(), title: "Sport", target: 5, unit: "Sessions", done: 4 };
    const t2_med = { id: uid(), title: "Meditation", target: 7, unit: "Tage", done: 7 };
    const t2_date = { id: uid(), title: "Date Night", target: 1, unit: "Abend", done: 1 };
    const t2_book = { id: uid(), title: "Buch lesen", target: 50, unit: "Seiten", done: 30 };

    // Week 3 targets
    const t3_calls = { id: uid(), title: "Kaltakquise‑Anrufe", target: 60, unit: "Calls", done: 25 };
    const t3_sport = { id: uid(), title: "Sport", target: 5, unit: "Sessions", done: 2 };
    const t3_med = { id: uid(), title: "Meditation", target: 7, unit: "Tage", done: 3 };
    const t3_date = { id: uid(), title: "Date Night", target: 1, unit: "Abend", done: 0 };

    // Week 4 targets (current week - in progress)
    const t4_calls = { id: uid(), title: "Kaltakquise‑Anrufe", target: 50, unit: "Calls", done: 12 };
    const t4_sport = { id: uid(), title: "Sport", target: 5, unit: "Sessions", done: 1 };
    const t4_content = { id: uid(), title: "Content erstellen", target: 3, unit: "Posts", done: 1 };

    cycle.weeklyTargets = {
        1: [t1_calls, t1_sport, t1_med, t1_date],
        2: [t2_calls, t2_sport, t2_med, t2_date, t2_book],
        3: [t3_calls, t3_sport, t3_med, t3_date],
        4: [t4_calls, t4_sport, t4_content]
    };

    // Week 1 daily blocks
    const w1 = cycle.weeks[0];
    cycle.dailyPlans[w1.startDate] = [
        { id: uid(), startTime: "09:00", endTime: "10:00", title: "10 Kaltakquise‑Calls", linkedTargetId: t1_calls.id, done: true, actual: 10 },
        { id: uid(), startTime: "12:30", endTime: "13:10", title: "Laufen", linkedTargetId: t1_sport.id, done: true },
        { id: uid(), startTime: "20:30", endTime: "20:45", title: "Meditation", linkedTargetId: t1_med.id, done: true }
    ];
    cycle.dailyPlans[addDays(w1.startDate, 1)] = [
        { id: uid(), startTime: "08:00", endTime: "09:30", title: "Calls + Follow‑ups", linkedTargetId: t1_calls.id, done: true, actual: 15 },
        { id: uid(), startTime: "17:00", endTime: "18:00", title: "Gym", linkedTargetId: t1_sport.id, done: true }
    ];
    cycle.dailyPlans[addDays(w1.startDate, 5)] = [
        { id: uid(), startTime: "19:00", endTime: "22:00", title: "Date Night Dinner", linkedTargetId: t1_date.id, done: true }
    ];

    // Week 2 daily blocks
    const w2 = cycle.weeks[1];
    cycle.dailyPlans[w2.startDate] = [
        { id: uid(), startTime: "09:00", endTime: "11:00", title: "Calls Block", linkedTargetId: t2_calls.id, done: true, actual: 12 },
        { id: uid(), startTime: "06:30", endTime: "06:45", title: "Morgen-Meditation", linkedTargetId: t2_med.id, done: true }
    ];
    cycle.dailyPlans[addDays(w2.startDate, 2)] = [
        { id: uid(), startTime: "12:00", endTime: "13:00", title: "Schwimmen", linkedTargetId: t2_sport.id, done: true },
        { id: uid(), startTime: "21:00", endTime: "22:00", title: "Lesen vor dem Schlafen", linkedTargetId: t2_book.id, done: true, actual: 30 }
    ];

    // Week 3 daily blocks
    const w3 = cycle.weeks[2];
    cycle.dailyPlans[w3.startDate] = [
        { id: uid(), startTime: "09:00", endTime: "10:30", title: "Morning Calls", linkedTargetId: t3_calls.id, done: true, actual: 8 },
        { id: uid(), startTime: "18:00", endTime: "19:00", title: "Joggen", linkedTargetId: t3_sport.id, done: true }
    ];

    // Week 4 daily blocks (today's week)
    const w4 = cycle.weeks[3];
    cycle.dailyPlans[w4.startDate] = [
        { id: uid(), startTime: "09:00", endTime: "10:00", title: "Akquise Calls", linkedTargetId: t4_calls.id, done: true, actual: 8 },
        { id: uid(), startTime: "14:00", endTime: "15:00", title: "LinkedIn Post schreiben", linkedTargetId: t4_content.id, done: true }
    ];
    cycle.dailyPlans[addDays(w4.startDate, 1)] = [
        { id: uid(), startTime: "07:00", endTime: "08:00", title: "Morgensport", linkedTargetId: t4_sport.id, done: true },
        { id: uid(), startTime: "10:00", endTime: "11:00", title: "Follow‑up Calls", linkedTargetId: t4_calls.id, done: false, actual: 4 }
    ];

    // Sample reviews
    cycle.weeklyReviews = {
        1: { good: "Sehr produktive Woche! Calls-Ziel fast erreicht, Sport geschafft.", bad: "Zeitmanagement könnte besser sein, oft abgelenkt.", change: "Telefon in Fokuszeiten ausschalten." },
        2: { good: "Meditation täglich durchgehalten, fühlt sich großartig an.", bad: "Weniger Calls als geplant.", change: "Calls früher am Tag machen." }
    };

    cycle.dailyReviews = {};
    cycle.dailyReviews[w1.startDate] = { good: "Produktiver Start in die Woche!", bad: "Spätes Aufstehen." };
    cycle.dailyReviews[addDays(w1.startDate, 1)] = { good: "15 Calls geschafft!", bad: "Kein Zeit für Meditation." };
    cycle.dailyReviews[w2.startDate] = { good: "Früh aufgestanden, Meditation gemacht.", bad: "Nachmittags müde." };
    cycle.journalEntries = [
        {
            id: uid(),
            title: "Quarterly Fokus notiert",
            content: "Diese 12 Wochen steht konsequente Umsetzung vor Perfektion.",
            date: w1.startDate,
            createdAt: new Date().toISOString()
        }
    ];

    // ─── Demo Habits ───
    const h1: Habit = { id: uid(), title: "Morgenroutine", emoji: "🌅", frequency: "daily", activeFrom: 1, activeTo: 12, startedAt: today, createdAt: today };
    const h2: Habit = { id: uid(), title: "Wasser trinken", emoji: "💧", frequency: "daily", activeFrom: 1, activeTo: 12, startedAt: today, createdAt: today };
    const h3: Habit = { id: uid(), title: "Journaling", emoji: "📝", frequency: "weekdays", activeFrom: 1, activeTo: 12, startedAt: today, createdAt: today };
    cycle.habits = [h1, h2, h3];

    // Sample habit log — simulate some completed habits across weeks
    cycle.habitLog = {};
    for (let wi = 0; wi < 3; wi++) {
        const week = cycle.weeks[wi];
        for (let d = 0; d < 7; d++) {
            const date = addDays(week.startDate, d);
            const dayOfWeek = parseIso(date).getDay();
            const log: string[] = [];
            // Morgenroutine: done most days
            if (Math.random() > 0.15) log.push(h1.id);
            // Wasser: done almost every day
            if (Math.random() > 0.1) log.push(h2.id);
            // Journaling: only weekdays (Mon-Fri = 1-5)
            if (dayOfWeek >= 1 && dayOfWeek <= 5 && Math.random() > 0.2) log.push(h3.id);
            if (log.length > 0) cycle.habitLog[date] = log;
        }
    }
    // Current week (week 4): only first 2 days
    for (let d = 0; d < 2; d++) {
        const date = addDays(w4.startDate, d);
        const dayOfWeek = parseIso(date).getDay();
        const log: string[] = [h1.id, h2.id];
        if (dayOfWeek >= 1 && dayOfWeek <= 5) log.push(h3.id);
        cycle.habitLog[date] = log;
    }

    return cycle;
}

// ─── Verification & Helpers ───
export function isHabitPlannedOnDate(cycle: Cycle, habit: Habit, date: string): boolean {
    const today = toIsoDate(new Date());
    // Future dates check is optional depending on use case, but for stats we usually check valid range
    // For backfilling, we definitely want to know if it WAS planned.

    if (habit.startedAt && date < habit.startedAt) return false;
    // createdAt check might be too strict for backfilling if user explicitly sets past start date. 
    // If they say "I started 1 week ago", we ignore createdAt.

    const weekIdx = getWeekIndexForDate(cycle, date);
    if (weekIdx < habit.activeFrom || weekIdx > habit.activeTo) return false;

    const dayOfWeek = parseIso(date).getDay();
    if (habit.frequency === 'daily') return true;
    if (habit.frequency === 'weekdays') return dayOfWeek >= 1 && dayOfWeek <= 5;
    if (Array.isArray(habit.frequency)) return habit.frequency.includes(dayOfWeek);
    return false;
}

export function migrateCycle(raw: any): Cycle | null {
    if (!raw) return null;
    if ((raw as Cycle).weeklyTargets) {
        const cycle = raw as Cycle;
        const asBool = (value: unknown): boolean => {
            if (typeof value === "boolean") return value;
            if (typeof value === "string") {
                const normalized = value.trim().toLowerCase();
                if (normalized === "true") return true;
                if (normalized === "false") return false;
            }
            return false;
        };
        const asSafeNumber = (value: unknown, fallback = 0): number => {
            if (typeof value === "number" && Number.isFinite(value)) return value;
            if (typeof value === "string" && value.trim()) {
                const parsed = Number(value);
                if (Number.isFinite(parsed)) return parsed;
            }
            return fallback;
        };

        // Backfill habits and habitLog for older cycles
        if (!cycle.habits) cycle.habits = [];
        if (!cycle.habitLog) cycle.habitLog = {};
        if (!cycle.dailyPlans) cycle.dailyPlans = {};
        if (!Array.isArray(cycle.journalEntries)) cycle.journalEntries = [];

        cycle.habits = cycle.habits.map((h) => ({
            ...h,
            startedAt: h.startedAt ?? h.createdAt ?? cycle.startDate
        }));

        const normalizedPlans: Record<string, DailyBlock[]> = {};
        Object.entries(cycle.dailyPlans).forEach(([date, blocks]) => {
            if (!Array.isArray(blocks)) return;
            const normalizedBlocks: DailyBlock[] = [];
            blocks.forEach((block, index) => {
                if (!block || typeof block !== "object") return;
                const rawBlock = block as Partial<DailyBlock> & Record<string, unknown>;

                const amountValue = asSafeNumber(rawBlock.amount, 0);
                const amount = amountValue >= 1 ? Math.floor(amountValue) : undefined;
                const rawActual = Math.max(0, Math.floor(asSafeNumber(rawBlock.actual, 0)));
                const actual = amount ? clamp(rawActual, 0, amount) : rawActual;
                const done = amount ? actual >= amount : asBool(rawBlock.done);

                normalizedBlocks.push({
                    id: typeof rawBlock.id === "string" && rawBlock.id.trim() ? rawBlock.id : uid(),
                    startTime: typeof rawBlock.startTime === "string" && rawBlock.startTime ? rawBlock.startTime : "09:00",
                    endTime: typeof rawBlock.endTime === "string" && rawBlock.endTime ? rawBlock.endTime : "10:00",
                    title: typeof rawBlock.title === "string" && rawBlock.title.trim() ? rawBlock.title : `Block ${index + 1}`,
                    linkedTargetId: typeof rawBlock.linkedTargetId === "string" && rawBlock.linkedTargetId ? rawBlock.linkedTargetId : undefined,
                    done,
                    amount,
                    actual,
                    googleEventId: typeof rawBlock.googleEventId === "string" && rawBlock.googleEventId ? rawBlock.googleEventId : undefined
                });
            });

            if (normalizedBlocks.length > 0) {
                normalizedPlans[date] = normalizedBlocks;
            }
        });
        cycle.dailyPlans = normalizedPlans;

        cycle.journalEntries = cycle.journalEntries
            .filter((entry) => entry && typeof entry === "object")
            .map((entry: any, index: number) => {
                const date = typeof entry.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(entry.date)
                    ? entry.date
                    : cycle.startDate;
                return {
                    id: typeof entry.id === "string" && entry.id.trim() ? entry.id : uid(),
                    title: typeof entry.title === "string" && entry.title.trim() ? entry.title.trim() : `Journal ${index + 1}`,
                    content: typeof entry.content === "string" ? entry.content : "",
                    date,
                    createdAt: typeof entry.createdAt === "string" && entry.createdAt.trim()
                        ? entry.createdAt
                        : `${date}T00:00:00.000Z`
                };
            });

        // CLEANUP: Remove future habit logs
        const today = toIsoDate(new Date());
        Object.keys(cycle.habitLog).forEach((date) => {
            if (date > today) {
                delete cycle.habitLog[date];
            }
        });

        return cycle;
    }
    return null;
}

// ─── Reducer ───
export const cycleReducer = (state: CycleState, action: CycleAction): CycleState => {
    switch (action.type) {
        case 'SET':
            return { present: action.payload, past: [], future: [] };
        case 'UPDATE':
            if (!state.present) return state;
            const newPresent = action.updateFn(state.present);
            if (newPresent === state.present) return state;
            return {
                past: [...state.past.slice(-19), state.present], // Keep last 20
                present: newPresent,
                future: []
            };
        case 'UNDO':
            if (state.past.length === 0 || !state.present) return state;
            const previous = state.past[state.past.length - 1];
            const newPast = state.past.slice(0, -1);
            return {
                past: newPast,
                present: previous,
                future: [state.present, ...state.future]
            };
        case 'REDO':
            if (state.future.length === 0 || !state.present) return state;
            const next = state.future[0];
            const newFuture = state.future.slice(1);
            return {
                past: [...state.past, state.present],
                present: next,
                future: newFuture
            };
        default:
            return state;
    }
};
