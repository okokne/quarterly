import { Cycle, DailyBlock } from "../types";
import { uid } from "./id";
import { toIsoDate } from "./date";
import { buildReviewEntriesFromLegacy, normalizeReviewEntries } from "./reviewEntries";
import { clamp } from "./cycleMath";

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

        if (!cycle.habits) cycle.habits = [];
        if (!cycle.habitLog) cycle.habitLog = {};
        if (!cycle.dailyPlans) cycle.dailyPlans = {};
        if (!Array.isArray(cycle.journalEntries)) cycle.journalEntries = [];

        cycle.habits = cycle.habits.map((habit) => ({
            ...habit,
            startedAt: habit.startedAt ?? habit.createdAt ?? cycle.startDate
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

        if (Array.isArray((cycle as Cycle & { reviewEntries?: unknown[] }).reviewEntries)
            && (cycle as Cycle & { reviewEntries?: unknown[] }).reviewEntries!.length > 0) {
            cycle.reviewEntries = normalizeReviewEntries(
                (cycle as Cycle & { reviewEntries?: unknown[] }).reviewEntries!,
                cycle
            );
        } else {
            cycle.reviewEntries = buildReviewEntriesFromLegacy(cycle);
        }

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
