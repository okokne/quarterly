import { Cycle, JournalContext } from "../types";

export const DEFAULT_JOURNAL_CONTEXTS: JournalContext[] = [
    { id: "private", label: "Privat" },
    { id: "business", label: "Business" },
    { id: "health", label: "Health" },
    { id: "sales", label: "Sales" },
    { id: "content", label: "Content" },
    { id: "mindset", label: "Mindset" }
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

export function normalizeJournalContexts(raw: unknown): JournalContext[] {
    if (!Array.isArray(raw)) return [...DEFAULT_JOURNAL_CONTEXTS];
    const deduped = new Map<string, JournalContext>();

    raw.forEach((item) => {
        if (!item || typeof item !== "object") return;
        const candidate = item as Partial<JournalContext>;
        const id = normalizeContextId(candidate.id);
        const label = normalizeContextLabel(candidate.label);
        if (!id || !label) return;
        if (!deduped.has(id)) {
            deduped.set(id, { id, label });
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

