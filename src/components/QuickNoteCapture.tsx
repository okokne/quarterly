import { useEffect, useMemo, useState } from "react";
import { SquarePen } from "lucide-react";
import { t as tr } from "../i18n";
import { AppLanguage, Cycle } from "../types";
import {
    createJournalQuickReviewEntry,
    getWritableReviewEntries,
    resolveDefaultJournalContextId,
    toIsoDate
} from "../utils";
import { Icon } from "./ui/Icon";

type QuickNoteCaptureProps = {
    cycle: Cycle;
    language: AppLanguage;
    readOnly: boolean;
    currentWeekIndex: number;
    open: boolean;
    setOpen: (next: boolean) => void;
    updateCycle: (updater: (prev: Cycle) => Cycle) => void;
};

export function QuickNoteCapture({
    cycle,
    language,
    readOnly,
    currentWeekIndex,
    open,
    setOpen,
    updateCycle
}: QuickNoteCaptureProps) {
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const defaultContextId = useMemo(() => resolveDefaultJournalContextId(cycle) ?? "", [cycle]);
    const [contextId, setContextId] = useState(defaultContextId);

    useEffect(() => {
        if (!open) return;
        setTitle("");
        setContent("");
        setContextId(defaultContextId);
    }, [defaultContextId, open]);

    useEffect(() => {
        if (!open) return;
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setOpen(false);
            }
        };
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [open, setOpen]);

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
                            <select
                                value={contextId}
                                onChange={(event) => setContextId(event.target.value)}
                            >
                                <option value="">{tr(language, "journal.contextNone")}</option>
                                {(cycle.journalContexts ?? []).map((context) => (
                                    <option key={context.id} value={context.id}>{context.label}</option>
                                ))}
                            </select>
                        </label>
                        <p className="muted quick-note-meta">{tr(language, "quickNote.meta", { week: currentWeekIndex })}</p>
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

