import type { Goal, WeeklyTarget } from "../types";

export const WEEKLY_TARGET_ACCENT_PALETTE = [
    "#F43F5E", // Ruby
    "#0EA5E9", // Sapphire
    "#F59E0B", // Topaz
    "#10B981", // Emerald
    "#A855F7", // Amethyst
    "#F97316", // Amber
    "#14B8A6", // Turquoise
    "#6366F1"  // Indigo
] as const;

const LEGACY_WEEKLY_TARGET_ACCENT_PALETTES: readonly string[][] = [
    [
        "#b7d9ff",
        "#bfeacb",
        "#ffe39a",
        "#e7bdfd",
        "#ffccd3",
        "#ffcba6",
        "#bde8e2",
        "#d2def2"
    ],
    [
        "#d9ebff",
        "#dff3e7",
        "#fff1cc",
        "#f5e2fe",
        "#ffe5e6",
        "#ffe8d6",
        "#def2f0",
        "#e8edf5"
    ],
    [
        "#9bb6ea",
        "#93c6b3",
        "#dec690",
        "#b8a4d8",
        "#f0b9cf",
        "#e3b394",
        "#a7b3bf",
        "#b9d39f"
    ]
] as const;

export const DEFAULT_WEEKLY_TARGET_ACCENT = WEEKLY_TARGET_ACCENT_PALETTE[0];

export function normalizeWeeklyTargetAccent(color: unknown): string | undefined {
    if (typeof color !== "string") return undefined;
    const normalized = color.trim().toLowerCase();
    if (!normalized) return undefined;
    if (WEEKLY_TARGET_ACCENT_PALETTE.includes(normalized as typeof WEEKLY_TARGET_ACCENT_PALETTE[number])) {
        return normalized;
    }
    for (const palette of LEGACY_WEEKLY_TARGET_ACCENT_PALETTES) {
        const legacyIndex = palette.indexOf(normalized);
        if (legacyIndex >= 0) {
            return WEEKLY_TARGET_ACCENT_PALETTE[legacyIndex];
        }
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
