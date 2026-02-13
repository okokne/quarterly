import { Cycle, Goal, Week, Habit } from "../types";
import { uid } from "./id";
import { addDays, parseIso, toIsoDate } from "./date";
import { buildReviewEntriesFromLegacy } from "./reviewEntries";

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
    const g3: Goal = { id: uid(), title: "Fokussierte Deep-Work-Routine etablieren.", metric: "5 Sessions/Woche" };
    cycle.goals = [g1, g2, g3];

    const t1_calls = { id: uid(), title: "Kaltakquise‑Anrufe", target: 50, unit: "Calls", done: 45 };
    const t1_sport = { id: uid(), title: "Sport", target: 5, unit: "Sessions", done: 5 };
    const t1_med = { id: uid(), title: "Meditation", target: 7, unit: "Tage", done: 6 };
    const t1_focus = { id: uid(), title: "Deep Work Sessions", target: 5, unit: "Sessions", done: 4 };

    const t2_calls = { id: uid(), title: "Kaltakquise‑Anrufe", target: 50, unit: "Calls", done: 38 };
    const t2_sport = { id: uid(), title: "Sport", target: 5, unit: "Sessions", done: 4 };
    const t2_med = { id: uid(), title: "Meditation", target: 7, unit: "Tage", done: 7 };
    const t2_focus = { id: uid(), title: "Deep Work Sessions", target: 5, unit: "Sessions", done: 3 };
    const t2_book = { id: uid(), title: "Buch lesen", target: 50, unit: "Seiten", done: 30 };

    const t3_calls = { id: uid(), title: "Kaltakquise‑Anrufe", target: 60, unit: "Calls", done: 25 };
    const t3_sport = { id: uid(), title: "Sport", target: 5, unit: "Sessions", done: 2 };
    const t3_med = { id: uid(), title: "Meditation", target: 7, unit: "Tage", done: 3 };
    const t3_focus = { id: uid(), title: "Deep Work Sessions", target: 5, unit: "Sessions", done: 2 };

    const t4_calls = { id: uid(), title: "Kaltakquise‑Anrufe", target: 50, unit: "Calls", done: 12 };
    const t4_sport = { id: uid(), title: "Sport", target: 5, unit: "Sessions", done: 1 };
    const t4_content = { id: uid(), title: "Content erstellen", target: 3, unit: "Posts", done: 1 };

    cycle.weeklyTargets = {
        1: [t1_calls, t1_sport, t1_med, t1_focus],
        2: [t2_calls, t2_sport, t2_med, t2_focus, t2_book],
        3: [t3_calls, t3_sport, t3_med, t3_focus],
        4: [t4_calls, t4_sport, t4_content]
    };

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
        { id: uid(), startTime: "18:30", endTime: "20:00", title: "Deep-Work Wochenplanung", linkedTargetId: t1_focus.id, done: true }
    ];

    const w2 = cycle.weeks[1];
    cycle.dailyPlans[w2.startDate] = [
        { id: uid(), startTime: "09:00", endTime: "11:00", title: "Calls Block", linkedTargetId: t2_calls.id, done: true, actual: 12 },
        { id: uid(), startTime: "06:30", endTime: "06:45", title: "Morgen-Meditation", linkedTargetId: t2_med.id, done: true }
    ];
    cycle.dailyPlans[addDays(w2.startDate, 2)] = [
        { id: uid(), startTime: "12:00", endTime: "13:00", title: "Schwimmen", linkedTargetId: t2_sport.id, done: true },
        { id: uid(), startTime: "21:00", endTime: "22:00", title: "Lesen vor dem Schlafen", linkedTargetId: t2_book.id, done: true, actual: 30 }
    ];

    const w3 = cycle.weeks[2];
    cycle.dailyPlans[w3.startDate] = [
        { id: uid(), startTime: "09:00", endTime: "10:30", title: "Morning Calls", linkedTargetId: t3_calls.id, done: true, actual: 8 },
        { id: uid(), startTime: "18:00", endTime: "19:00", title: "Joggen", linkedTargetId: t3_sport.id, done: true }
    ];

    const w4 = cycle.weeks[3];
    cycle.dailyPlans[w4.startDate] = [
        { id: uid(), startTime: "09:00", endTime: "10:00", title: "Akquise Calls", linkedTargetId: t4_calls.id, done: true, actual: 8 },
        { id: uid(), startTime: "14:00", endTime: "15:00", title: "LinkedIn Post schreiben", linkedTargetId: t4_content.id, done: true }
    ];
    cycle.dailyPlans[addDays(w4.startDate, 1)] = [
        { id: uid(), startTime: "07:00", endTime: "08:00", title: "Morgensport", linkedTargetId: t4_sport.id, done: true },
        { id: uid(), startTime: "10:00", endTime: "11:00", title: "Follow‑up Calls", linkedTargetId: t4_calls.id, done: false, actual: 4 }
    ];

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
    cycle.reviewEntries = buildReviewEntriesFromLegacy(cycle);

    const h1: Habit = { id: uid(), title: "Morgenroutine", emoji: "🌅", frequency: "daily", activeFrom: 1, activeTo: 12, startedAt: today, createdAt: today };
    const h2: Habit = { id: uid(), title: "Wasser trinken", emoji: "💧", frequency: "daily", activeFrom: 1, activeTo: 12, startedAt: today, createdAt: today };
    const h3: Habit = { id: uid(), title: "Journaling", emoji: "📝", frequency: "weekdays", activeFrom: 1, activeTo: 12, startedAt: today, createdAt: today };
    cycle.habits = [h1, h2, h3];

    cycle.habitLog = {};
    for (let weekIndex = 0; weekIndex < 3; weekIndex++) {
        const week = cycle.weeks[weekIndex];
        for (let day = 0; day < 7; day++) {
            const date = addDays(week.startDate, day);
            const dayOfWeek = parseIso(date).getDay();
            const log: string[] = [];
            if (Math.random() > 0.15) log.push(h1.id);
            if (Math.random() > 0.1) log.push(h2.id);
            if (dayOfWeek >= 1 && dayOfWeek <= 5 && Math.random() > 0.2) log.push(h3.id);
            if (log.length > 0) cycle.habitLog[date] = log;
        }
    }
    for (let day = 0; day < 2; day++) {
        const date = addDays(w4.startDate, day);
        const dayOfWeek = parseIso(date).getDay();
        const log: string[] = [h1.id, h2.id];
        if (dayOfWeek >= 1 && dayOfWeek <= 5) log.push(h3.id);
        cycle.habitLog[date] = log;
    }

    return cycle;
}
