import type { WeeklyTarget } from "../types";

export const WEEKLY_TARGET_ACCENT_PALETTE = [
    "#9bb6ea",
    "#93c6b3",
    "#dec690",
    "#b8a4d8",
    "#e3b394",
    "#a7b3bf"
] as const;

export const DEFAULT_WEEKLY_TARGET_ACCENT = WEEKLY_TARGET_ACCENT_PALETTE[0];

export function buildWeeklyTargetAccentMap(targets: Pick<WeeklyTarget, "id">[]): Map<string, string> {
    const accentMap = new Map<string, string>();
    targets.forEach((target, index) => {
        accentMap.set(
            String(target.id),
            WEEKLY_TARGET_ACCENT_PALETTE[index % WEEKLY_TARGET_ACCENT_PALETTE.length]
        );
    });
    return accentMap;
}
