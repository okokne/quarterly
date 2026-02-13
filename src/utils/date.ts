import { AppLanguage, DateFormat, TimeFormat } from "../types";

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
