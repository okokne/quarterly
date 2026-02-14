import { AppLanguage, ReviewEntry } from "../../types";

export function monthLabel(monthKey: string, language: AppLanguage): string {
    const [yearRaw, monthRaw] = monthKey.split("-");
    const year = Number.parseInt(yearRaw ?? "", 10);
    const month = Number.parseInt(monthRaw ?? "", 10);
    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
        return monthKey;
    }

    const locale = language === "de" ? "de-DE" : "en-US";
    return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(new Date(year, month - 1, 1));
}

export function previewText(entry: ReviewEntry): string {
    if (entry.type === "custom" || entry.type === "quick") {
        const title = entry.title?.trim() ?? "";
        const body = entry.content?.trim() ?? "";
        return [title, body].filter(Boolean).join(" · ");
    }

    const parts = [entry.good?.trim(), entry.bad?.trim(), entry.change?.trim()].filter(Boolean);
    return parts.join(" · ");
}
