import { t as tr } from "../i18n";
import { AppLanguage, Cycle } from "../types";

export const MAX_WEEK_NAME_LENGTH = 60;

export function normalizeWeekName(value: unknown): string | undefined {
    if (typeof value !== "string") return undefined;
    const normalized = value.trim().replace(/\s+/g, " ");
    if (!normalized) return undefined;
    return normalized.slice(0, MAX_WEEK_NAME_LENGTH);
}

export function buildWeekLabel(language: AppLanguage, weekIndex: number, weekName?: string): string {
    const normalizedWeekName = normalizeWeekName(weekName);
    if (!normalizedWeekName) {
        return tr(language, "app.headerWeekShort", { week: weekIndex });
    }
    return tr(language, "app.headerWeekNamed", { week: weekIndex, name: normalizedWeekName });
}

export function getWeekLabel(cycle: Cycle, weekIndex: number, language: AppLanguage): string {
    const week = cycle.weeks.find((item) => item.index === weekIndex);
    return buildWeekLabel(language, weekIndex, week?.weekName);
}

