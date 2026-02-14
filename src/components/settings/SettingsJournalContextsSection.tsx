import { useEffect, useMemo, useState } from "react";
import { t as tr } from "../../i18n";
import { AppLanguage, Cycle } from "../../types";
import { uid } from "../../utils";

type SettingsJournalContextsSectionProps = {
    cycle: Cycle;
    language: AppLanguage;
    readOnly: boolean;
    updateCycle: (updater: (prev: Cycle) => Cycle) => void;
};

function slugifyContextId(input: string): string {
    const normalized = input.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/-+/g, "-");
    return normalized.replace(/^-+|-+$/g, "");
}

export function SettingsJournalContextsSection({
    cycle,
    language,
    readOnly,
    updateCycle
}: SettingsJournalContextsSectionProps) {
    const contexts = cycle.journalContexts ?? [];
    const [newContext, setNewContext] = useState("");
    const [draftLabels, setDraftLabels] = useState<Record<string, string>>({});

    useEffect(() => {
        const nextDrafts: Record<string, string> = {};
        contexts.forEach((context) => {
            nextDrafts[context.id] = context.label;
        });
        setDraftLabels(nextDrafts);
    }, [contexts]);

    const normalizedLabels = useMemo(
        () => new Set(contexts.map((context) => context.label.trim().toLowerCase())),
        [contexts]
    );

    const handleAddContext = () => {
        if (readOnly) return;
        const trimmed = newContext.trim();
        if (!trimmed) return;
        if (normalizedLabels.has(trimmed.toLowerCase())) return;

        updateCycle((prev) => {
            const existingContexts = prev.journalContexts ?? [];
            const generatedId = slugifyContextId(trimmed) || `ctx-${uid().slice(0, 8)}`;
            const idTaken = new Set(existingContexts.map((context) => context.id));
            const nextId = idTaken.has(generatedId) ? `${generatedId}-${uid().slice(0, 6)}` : generatedId;
            const nextContexts = [...existingContexts, { id: nextId, label: trimmed }];
            return {
                ...prev,
                journalContexts: nextContexts,
                defaultJournalContextId: prev.defaultJournalContextId?.trim() || nextId
            };
        });
        setNewContext("");
    };

    const commitRename = (contextId: string) => {
        if (readOnly) return;
        const nextLabel = (draftLabels[contextId] ?? "").trim();
        if (!nextLabel) {
            setDraftLabels((prev) => ({
                ...prev,
                [contextId]: contexts.find((context) => context.id === contextId)?.label ?? ""
            }));
            return;
        }

        updateCycle((prev) => {
            const nextContexts = (prev.journalContexts ?? []).map((context) => (
                context.id === contextId ? { ...context, label: nextLabel } : context
            ));
            return {
                ...prev,
                journalContexts: nextContexts
            };
        });
    };

    const handleDeleteContext = (contextId: string) => {
        if (readOnly) return;
        if (!window.confirm(tr(language, "settings.journalContextDeleteConfirm"))) return;

        updateCycle((prev) => {
            const nextContexts = (prev.journalContexts ?? []).filter((context) => context.id !== contextId);
            const nextDefault = nextContexts.some((context) => context.id === prev.defaultJournalContextId)
                ? prev.defaultJournalContextId
                : nextContexts[0]?.id;
            const nextEntries = (prev.reviewEntries ?? []).map((entry) => (
                entry.contextId === contextId
                    ? { ...entry, contextId: undefined }
                    : entry
            ));
            return {
                ...prev,
                journalContexts: nextContexts,
                defaultJournalContextId: nextDefault,
                reviewEntries: nextEntries
            };
        });
    };

    return (
        <div className="settings-section">
            <h3>{tr(language, "settings.journalContextsTitle")}</h3>
            <p className="muted">{tr(language, "settings.journalContextsHint")}</p>

            <div className="settings-journal-context-list">
                {contexts.map((context) => (
                    <div key={context.id} className="settings-journal-context-item">
                        <input
                            value={draftLabels[context.id] ?? context.label}
                            onChange={(event) => setDraftLabels((prev) => ({ ...prev, [context.id]: event.target.value }))}
                            onBlur={() => commitRename(context.id)}
                            onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                    event.currentTarget.blur();
                                }
                            }}
                            disabled={readOnly}
                        />
                        <button
                            type="button"
                            className="ghost-danger"
                            onClick={() => handleDeleteContext(context.id)}
                            disabled={readOnly}
                        >
                            {tr(language, "common.delete")}
                        </button>
                    </div>
                ))}
            </div>

            <div className="settings-journal-context-default-row">
                <label>{tr(language, "settings.journalContextDefault")}</label>
                <select
                    className="settings-select"
                    value={cycle.defaultJournalContextId ?? ""}
                    onChange={(event) => {
                        const next = event.target.value || undefined;
                        updateCycle((prev) => ({ ...prev, defaultJournalContextId: next }));
                    }}
                    disabled={readOnly || contexts.length === 0}
                >
                    {contexts.map((context) => (
                        <option key={context.id} value={context.id}>{context.label}</option>
                    ))}
                </select>
            </div>

            <div className="settings-journal-context-add-row">
                <input
                    value={newContext}
                    onChange={(event) => setNewContext(event.target.value)}
                    placeholder={tr(language, "settings.journalContextPlaceholder")}
                    disabled={readOnly}
                />
                <button
                    type="button"
                    onClick={handleAddContext}
                    disabled={readOnly || !newContext.trim()}
                >
                    {tr(language, "settings.journalContextAdd")}
                </button>
            </div>
        </div>
    );
}

