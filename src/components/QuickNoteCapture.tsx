import { CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, SquarePen } from "./ui/icons";
import { t as tr } from "../i18n";
import { AppLanguage, Cycle, DateFormat } from "../types";
import {
    createJournalQuickReviewEntry,
    formatDate,
    getWritableReviewEntries,
    resolveDefaultJournalContextId,
    toIsoDate
} from "../utils";
import { Icon } from "./ui/Icon";

type QuickNoteCaptureProps = {
    cycle: Cycle;
    language: AppLanguage;
    dateFormat: DateFormat;
    readOnly: boolean;
    currentWeekIndex: number;
    open: boolean;
    setOpen: (next: boolean) => void;
    updateCycle: (updater: (prev: Cycle) => Cycle) => void;
    showFab?: boolean;
};

export function QuickNoteCapture({
    cycle,
    language,
    dateFormat,
    readOnly,
    currentWeekIndex,
    open,
    setOpen,
    updateCycle,
    showFab = true
}: QuickNoteCaptureProps) {
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const defaultContextId = useMemo(() => resolveDefaultJournalContextId(cycle) ?? "", [cycle]);
    const [contextId, setContextId] = useState(defaultContextId);
    const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);
    const contextPickerRef = useRef<HTMLDivElement | null>(null);
    const contextOptions = cycle.journalContexts ?? [];
    const selectedContext = contextOptions.find((context) => context.id === contextId) ?? null;
    const todayLabel = useMemo(() => formatDate(toIsoDate(new Date()), dateFormat, language), [dateFormat, language]);

    useEffect(() => {
        if (!open) return;
        setTitle("");
        setContent("");
        setContextId(defaultContextId);
        setIsContextMenuOpen(false);
    }, [defaultContextId, open]);

    useEffect(() => {
        if (!open) return;
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                if (isContextMenuOpen) {
                    setIsContextMenuOpen(false);
                    return;
                }
                setOpen(false);
            }
        };
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [isContextMenuOpen, open, setOpen]);

    useEffect(() => {
        if (!open || !isContextMenuOpen) return;
        const onMouseDown = (event: MouseEvent) => {
            if (!contextPickerRef.current?.contains(event.target as Node)) {
                setIsContextMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", onMouseDown);
        return () => {
            document.removeEventListener("mousedown", onMouseDown);
        };
    }, [isContextMenuOpen, open]);

    const submitDisabled = !title.trim() && !content.trim();

    const handleSave = () => {
        if (readOnly) return;
        const today = toIsoDate(new Date());
        const created = createJournalQuickReviewEntry({
            title,
            content,
            date: today,
            weekIndex: currentWeekIndex,
            contextId: contextId || undefined
        });
        if (!created) return;

        updateCycle((prev) => ({
            ...prev,
            reviewEntries: [created, ...getWritableReviewEntries(prev)]
        }));
        setOpen(false);
    };

    return (
        <>
            {showFab && (
                <button
                    type="button"
                    className="quick-note-fab"
                    onClick={() => setOpen(true)}
                    disabled={readOnly}
                    title={tr(language, "quickNote.tooltip")}
                    aria-label={tr(language, "quickNote.tooltip")}
                >
                    <Icon icon={SquarePen} size={19} />
                </button>
            )}

            {open && (
                <div className="modal-backdrop quick-note-backdrop" onClick={() => setOpen(false)}>
                    <div className="modal quick-note-modal" onClick={(event) => event.stopPropagation()}>
                        <h3>{tr(language, "quickNote.title")}</h3>
                        <p className="muted quick-note-subtitle">{tr(language, "quickNote.subtitle")}</p>
                        <label>
                            {tr(language, "common.title")} ({tr(language, "common.optional")})
                            <input
                                value={title}
                                onChange={(event) => setTitle(event.target.value)}
                                placeholder={tr(language, "quickNote.titlePlaceholder")}
                            />
                        </label>
                        <label>
                            {tr(language, "quickNote.text")}
                            <textarea
                                value={content}
                                onChange={(event) => setContent(event.target.value)}
                                placeholder={tr(language, "quickNote.textPlaceholder")}
                                autoFocus
                            />
                        </label>
                        <label>
                            {tr(language, "quickNote.context")}
                            <div className="quick-note-context-picker" ref={contextPickerRef}>
                                <button
                                    type="button"
                                    className={`quick-note-context-trigger ${isContextMenuOpen ? "open" : ""}`}
                                    onClick={() => setIsContextMenuOpen((prev) => !prev)}
                                    aria-haspopup="listbox"
                                    aria-expanded={isContextMenuOpen}
                                >
                                    <span className="quick-note-context-trigger-label">
                                        {selectedContext?.label ?? tr(language, "journal.contextNone")}
                                    </span>
                                    <span className="quick-note-context-trigger-right">
                                        <span
                                            className={`quick-note-context-dot ${selectedContext ? "" : "none"}`.trim()}
                                            style={selectedContext
                                                ? ({ "--quick-note-context-color": selectedContext.color } as CSSProperties)
                                                : undefined}
                                            aria-hidden="true"
                                        />
                                        <span className={`quick-note-context-caret ${isContextMenuOpen ? "open" : ""}`} aria-hidden="true">
                                            <Icon icon={ChevronRight} size={12} />
                                        </span>
                                    </span>
                                </button>
                                {isContextMenuOpen && (
                                    <div className="quick-note-context-menu" role="listbox" aria-label={tr(language, "quickNote.context")}>
                                        <button
                                            type="button"
                                            className={`quick-note-context-option ${contextId === "" ? "active" : ""}`}
                                            onClick={() => {
                                                setContextId("");
                                                setIsContextMenuOpen(false);
                                            }}
                                        >
                                            <span>{tr(language, "journal.contextNone")}</span>
                                            <span className="quick-note-context-dot none" aria-hidden="true" />
                                        </button>
                                        {contextOptions.map((context) => (
                                            <button
                                                key={context.id}
                                                type="button"
                                                className={`quick-note-context-option ${contextId === context.id ? "active" : ""}`}
                                                onClick={() => {
                                                    setContextId(context.id);
                                                    setIsContextMenuOpen(false);
                                                }}
                                            >
                                                <span>{context.label}</span>
                                                <span
                                                    className="quick-note-context-dot"
                                                    style={{ "--quick-note-context-color": context.color } as CSSProperties}
                                                    aria-hidden="true"
                                                />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </label>
                        <p className="muted quick-note-meta">{tr(language, "quickNote.meta", { date: todayLabel, week: currentWeekIndex })}</p>
                        <div className="modal-actions">
                            <button className="primary" onClick={handleSave} disabled={readOnly || submitDisabled}>
                                {tr(language, "quickNote.save")}
                            </button>
                            <button onClick={() => setOpen(false)}>{tr(language, "quickNote.cancel")}</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
