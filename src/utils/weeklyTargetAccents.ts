import type { Goal, WeeklyTarget } from "../types";

export const WEEKLY_TARGET_ACCENT_PALETTE = [
    "#9bb6ea",
    "#93c6b3",
    "#dec690",
    "#b8a4d8",
    "#f0b9cf",
    "#e3b394",
    "#a7b3bf",
    "#b9d39f"
] as const;

export const DEFAULT_WEEKLY_TARGET_ACCENT = WEEKLY_TARGET_ACCENT_PALETTE[0];

export function normalizeWeeklyTargetAccent(color: unknown): string | undefined {
    if (typeof color !== "string") return undefined;
    const normalized = color.trim().toLowerCase();
    if (!normalized) return undefined;
    if (WEEKLY_TARGET_ACCENT_PALETTE.includes(normalized as typeof WEEKLY_TARGET_ACCENT_PALETTE[number])) {
        return normalized;
    }
    return undefined;
}

export function buildGoalAccentMap(goals: Pick<Goal, "id" | "color">[]): Map<string, string> {
    const accentMap = new Map<string, string>();
    goals.forEach((goal, index) => {
        const storedAccent = normalizeWeeklyTargetAccent(goal.color);
        accentMap.set(
            String(goal.id),
            storedAccent ?? WEEKLY_TARGET_ACCENT_PALETTE[index % WEEKLY_TARGET_ACCENT_PALETTE.length]
        );
    });
    return accentMap;
}

export function buildWeeklyTargetAccentMap(
    targets: Pick<WeeklyTarget, "id" | "color" | "goalId">[],
    goals: Pick<Goal, "id" | "color">[] = []
): Map<string, string> {
    const accentMap = new Map<string, string>();
    const goalAccentById = buildGoalAccentMap(goals);
    targets.forEach((target, index) => {
        const linkedGoalAccent = target.goalId ? goalAccentById.get(String(target.goalId)) : undefined;
        const storedAccent = normalizeWeeklyTargetAccent(target.color);
        accentMap.set(
            String(target.id),
            linkedGoalAccent ?? storedAccent ?? WEEKLY_TARGET_ACCENT_PALETTE[index % WEEKLY_TARGET_ACCENT_PALETTE.length]
        );
    });
    return accentMap;
}
