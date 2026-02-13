import { AppLanguage, Id } from "../types";
import { t as tr } from "../i18n";

export interface ConfirmModalsProps {
    language: AppLanguage;
    // Demo confirm
    showDemoConfirm: boolean;
    setShowDemoConfirm: (val: boolean) => void;
    handleLoadDemo: () => void;
    // Template modal
    showTemplateModal: boolean;
    setShowTemplateModal: (val: boolean) => void;
    templateNameDraft: string;
    setTemplateNameDraft: (val: string) => void;
    handleSaveAsTemplate: (name: string) => void;
    // Delete/Archive confirm
    showDeleteConfirm: boolean;
    setShowDeleteConfirm: (val: boolean) => void;
    handleArchiveCycle: () => void;
    // Legacy prompt
    showLegacyPrompt: boolean;
    setShowLegacyPrompt: (val: boolean) => void;
    handleResetLegacy: () => void;
    // Archive delete confirm
    showArchiveDeleteConfirm: Id | null;
    setShowArchiveDeleteConfirm: (id: Id | null) => void;
    handleDeleteFromHistory: (id: Id) => void;
}

export function ConfirmModals({
    language,
    showDemoConfirm,
    setShowDemoConfirm,
    handleLoadDemo,
    showTemplateModal,
    setShowTemplateModal,
    templateNameDraft,
    setTemplateNameDraft,
    handleSaveAsTemplate,
    showDeleteConfirm,
    setShowDeleteConfirm,
    handleArchiveCycle,
    showLegacyPrompt,
    setShowLegacyPrompt,
    handleResetLegacy,
    showArchiveDeleteConfirm,
    setShowArchiveDeleteConfirm,
    handleDeleteFromHistory
}: ConfirmModalsProps) {
    return (
        <>
            {showDemoConfirm && (
                <div className="modal-backdrop">
                    <div className="modal">
                        <h3>{tr(language, "modals.demoTitle")}</h3>
                        <p>{tr(language, "modals.demoBody")}</p>
                        <div className="modal-actions">
                            <button onClick={() => setShowDemoConfirm(false)}>{tr(language, "common.cancel")}</button>
                            <button
                                className="primary"
                                onClick={() => {
                                    setShowDemoConfirm(false);
                                    handleLoadDemo();
                                }}
                            >
                                {tr(language, "modals.demoConfirm")}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showTemplateModal && (
                <div className="modal-backdrop">
                    <div className="modal">
                        <h3>{tr(language, "modals.templateTitle")}</h3>
                        <p>{tr(language, "modals.templateBody")}</p>
                        <input
                            type="text"
                            placeholder={tr(language, "modals.templatePlaceholder")}
                            value={templateNameDraft}
                            onChange={(e) => setTemplateNameDraft(e.target.value)}
                            autoFocus
                        />
                        <div className="modal-actions">
                            <button onClick={() => { setShowTemplateModal(false); setTemplateNameDraft(""); }}>{tr(language, "common.cancel")}</button>
                            <button
                                className="primary"
                                onClick={() => handleSaveAsTemplate(templateNameDraft)}
                                disabled={!templateNameDraft.trim()}
                            >
                                {tr(language, "common.save")}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showDeleteConfirm && (
                <div className="modal-backdrop">
                    <div className="modal">
                        <h3>{tr(language, "modals.archiveTitle")}</h3>
                        <p>{tr(language, "modals.archiveBody")}</p>
                        <div className="modal-actions">
                            <button onClick={() => setShowDeleteConfirm(false)}>{tr(language, "common.cancel")}</button>
                            <button
                                className="primary"
                                onClick={() => {
                                    setShowDeleteConfirm(false);
                                    handleArchiveCycle();
                                }}
                            >
                                {tr(language, "modals.archiveConfirm")}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showLegacyPrompt && (
                <div className="modal-backdrop">
                    <div className="modal">
                        <h3>{tr(language, "modals.legacyTitle")}</h3>
                        <p>{tr(language, "modals.legacyBody")}</p>
                        <div className="modal-actions">
                            <button onClick={() => setShowLegacyPrompt(false)}>{tr(language, "modals.later")}</button>
                            <button className="primary" onClick={handleResetLegacy}>{tr(language, "modals.deleteData")}</button>
                        </div>
                    </div>
                </div>
            )}

            {showArchiveDeleteConfirm && (
                <div className="modal-backdrop">
                    <div className="modal">
                        <h3>{tr(language, "modals.deleteArchiveTitle")}</h3>
                        <p>{tr(language, "modals.deleteArchiveBody")}</p>
                        <div className="modal-actions">
                            <button onClick={() => setShowArchiveDeleteConfirm(null)}>{tr(language, "common.cancel")}</button>
                            <button
                                className="button danger"
                                onClick={() => {
                                    if (showArchiveDeleteConfirm) handleDeleteFromHistory(showArchiveDeleteConfirm);
                                }}
                            >
                                {tr(language, "common.delete")}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </>
    );
}
