import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Pencil, Trash2, X } from "../ui/icons";
import { t as tr } from "../../i18n";
import { AppLanguage, Cycle } from "../../types";
import { JOURNAL_LABEL_COLOR_PALETTE, pickNextJournalContextColor, uid } from "../../utils";
import { Icon } from "../ui/Icon";

type SettingsJournalContextsSectionProps = {
    cycle: Cycle;
    language: AppLanguage;
    readOnly: boolean;
    updateCycle: (updater: (prev: Cycle) => Cycle) => void;
    focusedContextId?: string | null;
};

function slugifyContextId(input: string): string {
    const normalized = input.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/-+/g, "-");
    return normalized.replace(/^-+|-+$/g, "");
}

export function SettingsJournalContextsSection({
    cycle,
    language,
    readOnly,
    updateCycle,
    focusedContextId
}: SettingsJournalContextsSectionProps) {
    const isPaletteColor = (color: string): boolean => JOURNAL_LABEL_COLOR_PALETTE.includes(color.trim().toLowerCase());
    const contexts = cycle.journalContexts ?? [];
    const [newContext, setNewContext] = useState("");
    const [newContextColor, setNewContextColor] = useState(() => pickNextJournalContextColor(contexts));
    const [editingContextId, setEditingContextId] = useState<string | null>(null);
    const [editDraft, setEditDraft] = useState("");
    const [editColorDraft, setEditColorDraft] = useState(JOURNAL_LABEL_COLOR_PALETTE[0]);
    const [highlightedContextId, setHighlightedContextId] = useState<string | null>(null);
    const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});

    useEffect(() => {
        if (!focusedContextId) return;
        const targetRow = rowRefs.current[focusedContextId];
        if (!targetRow) return;
        targetRow.scrollIntoView({ block: "center", behavior: "smooth" });
        setHighlightedContextId(focusedContextId);
        const timeout = window.setTimeout(() => setHighlightedContextId(null), 2200);
        return () => window.clearTimeout(timeout);
    }, [focusedContextId, contexts]);

    useEffect(() => {
        if (!newContextColor || !isPaletteColor(newContextColor)) {
            setNewContextColor(pickNextJournalContextColor(contexts));
        }
    }, [contexts, newContextColor]);

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
            const selectedColor = isPaletteColor(newContextColor)
                ? newContextColor.toLowerCase()
                : pickNextJournalContextColor(existingContexts);
            const nextContexts = [
                ...existingContexts,
                {
                    id: nextId,
                    label: trimmed,
                    color: selectedColor
                }
            ];
            return {
                ...prev,
                journalContexts: nextContexts,
                defaultJournalContextId: prev.defaultJournalContextId?.trim() || nextId
            };
        });
        setNewContext("");
        const nextColorSeed = isPaletteColor(newContextColor)
            ? newContextColor.toLowerCase()
            : pickNextJournalContextColor(contexts);
        setNewContextColor(
            pickNextJournalContextColor([
                ...contexts,
                { id: "temp-next", label: trimmed, color: nextColorSeed }
            ])
        );
    };

    const startRename = (contextId: string, currentLabel: string, currentColor: string) => {
        setEditingContextId(contextId);
        setEditDraft(currentLabel);
        setEditColorDraft(
            isPaletteColor(currentColor)
                ? currentColor.toLowerCase()
                : JOURNAL_LABEL_COLOR_PALETTE[0]
        );
    };

    const cancelRename = () => {
        setEditingContextId(null);
        setEditDraft("");
        setEditColorDraft(JOURNAL_LABEL_COLOR_PALETTE[0]);
    };

    const saveRename = (contextId: string) => {
        if (readOnly) return;
        const nextLabel = editDraft.trim();
        if (!nextLabel) {
            cancelRename();
            return;
        }

        updateCycle((prev) => ({
            ...prev,
            journalContexts: (prev.journalContexts ?? []).map((context) => (
                context.id === contextId
                    ? {
                        ...context,
                        label: nextLabel,
                        color: isPaletteColor(editColorDraft)
                            ? editColorDraft.toLowerCase()
                            : context.color
                    }
                    : context
            ))
        }));
        cancelRename();
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
                entry.contextId === contextId ? { ...entry, contextId: undefined } : entry
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

            <div className="settings-context-list">
                {contexts.map((context) => {
                    const isEditing = editingContextId === context.id;
                    const isHighlighted = highlightedContextId === context.id;
                    return (
                        <div
                            key={context.id}
                            ref={(node) => {
                                rowRefs.current[context.id] = node;
                            }}
                            className={`settings-context-row ${isHighlighted ? "highlighted" : ""}`}
                        >
                            <span className="settings-context-swatch" style={{ backgroundColor: context.color }} aria-hidden="true" />
                            {isEditing ? (
                                <div className="settings-context-edit-group">
                                    <input
                                        value={editDraft}
                                        onChange={(event) => setEditDraft(event.target.value)}
                                        onKeyDown={(event) => {
                                            if (event.key === "Enter") saveRename(context.id);
                                            if (event.key === "Escape") cancelRename();
                                        }}
                                        autoFocus
                                        disabled={readOnly}
                                    />
                                    <div className="settings-label-color-grid">
                                        {JOURNAL_LABEL_COLOR_PALETTE.map((color) => (
                                            <button
                                                key={`${context.id}-${color}`}
                                                type="button"
                                                className={`settings-label-color-dot ${editColorDraft === color ? "selected" : ""}`}
                                                style={{ backgroundColor: color }}
                                                onClick={() => setEditColorDraft(color)}
                                                aria-label={`${tr(language, "settings.journalLabelColor")} ${color}`}
                                                title={color}
                                                disabled={readOnly}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <span className="settings-context-name">{context.label}</span>
                            )}
                            <div className="settings-context-actions">
                                {isEditing ? (
                                    <>
                                        <button type="button" className="icon-btn" onClick={() => saveRename(context.id)} disabled={readOnly || !editDraft.trim()} aria-label={tr(language, "common.save")} title={tr(language, "common.save")}>
                                            <Icon icon={Check} size={14} />
                                        </button>
                                        <button type="button" className="icon-btn" onClick={cancelRename} aria-label={tr(language, "common.cancel")} title={tr(language, "common.cancel")}>
                                            <Icon icon={X} size={14} />
                                        </button>
                                    </>
                                ) : (
                                    <button type="button" className="icon-btn" onClick={() => startRename(context.id, context.label, context.color)} disabled={readOnly} aria-label={tr(language, "common.edit")} title={tr(language, "common.edit")}>
                                        <Icon icon={Pencil} size={14} />
                                    </button>
                                )}
                                <button type="button" className="icon-btn ghost-danger" onClick={() => handleDeleteContext(context.id)} disabled={readOnly} aria-label={tr(language, "common.delete")} title={tr(language, "common.delete")}>
                                    <Icon icon={Trash2} size={14} />
                                </button>
                            </div>
                        </div>
                    );
                })}
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
                <div className="settings-label-color-grid">
                    {JOURNAL_LABEL_COLOR_PALETTE.map((color) => (
                        <button
                            key={`new-${color}`}
                            type="button"
                            className={`settings-label-color-dot ${newContextColor === color ? "selected" : ""}`}
                            style={{ backgroundColor: color }}
                            onClick={() => setNewContextColor(color)}
                            aria-label={`${tr(language, "settings.journalLabelColor")} ${color}`}
                            title={color}
                            disabled={readOnly}
                        />
                    ))}
                </div>
                <button type="button" onClick={handleAddContext} disabled={readOnly || !newContext.trim()}>
                    {tr(language, "settings.journalContextAdd")}
                </button>
            </div>
        </div>
    );
}
