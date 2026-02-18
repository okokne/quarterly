import { Cycle, JournalContext } from "../types";
import { normalizeWeeklyTargetAccent, WEEKLY_TARGET_ACCENT_PALETTE } from "./weeklyTargetAccents";

export const JOURNAL_LABEL_COLOR_PALETTE: string[] = [...WEEKLY_TARGET_ACCENT_PALETTE];

export const DEFAULT_JOURNAL_CONTEXTS: JournalContext[] = [
    { id: "private", label: "Privat", color: JOURNAL_LABEL_COLOR_PALETTE[0] },
    { id: "business", label: "Business", color: JOURNAL_LABEL_COLOR_PALETTE[1] },
    { id: "health", label: "Health", color: JOURNAL_LABEL_COLOR_PALETTE[2] },
    { id: "sales", label: "Sales", color: JOURNAL_LABEL_COLOR_PALETTE[3] },
    { id: "content", label: "Content", color: JOURNAL_LABEL_COLOR_PALETTE[4] },
    { id: "mindset", label: "Mindset", color: JOURNAL_LABEL_COLOR_PALETTE[5] }
];

function normalizeContextId(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const normalized = value.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
    return normalized ? normalized : null;
}

function normalizeContextLabel(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const normalized = value.trim();
    return normalized ? normalized : null;
}

function normalizeContextColor(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const normalized = value.trim().toLowerCase();
    const migratedAccent = normalizeWeeklyTargetAccent(normalized);
    if (migratedAccent) return migratedAccent;
    if (!/^#([0-9a-fA-F]{6})$/.test(normalized)) return null;
    return normalized;
}

function colorForIndex(index: number): string {
    return JOURNAL_LABEL_COLOR_PALETTE[index % JOURNAL_LABEL_COLOR_PALETTE.length];
}

export function pickNextJournalContextColor(existingContexts: JournalContext[]): string {
    if (existingContexts.length === 0) return colorForIndex(0);
    const used = new Set(existingContexts.map((context) => context.color.trim().toLowerCase()));
    const nextUnused = JOURNAL_LABEL_COLOR_PALETTE.find((color) => !used.has(color));
    if (nextUnused) return nextUnused;
    return colorForIndex(existingContexts.length);
}

export function normalizeJournalContexts(raw: unknown): JournalContext[] {
    if (!Array.isArray(raw)) return [...DEFAULT_JOURNAL_CONTEXTS];
    const deduped = new Map<string, JournalContext>();

    raw.forEach((item, index) => {
        if (!item || typeof item !== "object") return;
        const candidate = item as Partial<JournalContext>;
        const id = normalizeContextId(candidate.id);
        const label = normalizeContextLabel(candidate.label);
        const color = normalizeContextColor(candidate.color) ?? colorForIndex(index);
        if (!id || !label) return;
        if (!deduped.has(id)) {
            deduped.set(id, { id, label, color });
        }
    });

    return deduped.size > 0 ? Array.from(deduped.values()) : [...DEFAULT_JOURNAL_CONTEXTS];
}

export function resolveDefaultJournalContextId(cycle: Cycle): string | undefined {
    const contexts = cycle.journalContexts ?? [];
    if (contexts.length === 0) return undefined;
    const current = cycle.defaultJournalContextId?.trim();
    if (current && contexts.some((context) => context.id === current)) {
        return current;
    }
    return contexts[0]?.id;
}
