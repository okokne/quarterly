import { ConfirmModalsProps } from "../components/ConfirmModals";

type ConfirmModalsBindingInput = {
    language: ConfirmModalsProps["language"];
    template: Pick<
        ConfirmModalsProps,
        "showTemplateModal" |
        "setShowTemplateModal" |
        "templateNameDraft" |
        "setTemplateNameDraft" |
        "handleSaveAsTemplate"
    >;
    archive: Pick<
        ConfirmModalsProps,
        "showDeleteConfirm" |
        "setShowDeleteConfirm" |
        "handleArchiveCycle" |
        "showArchiveDeleteConfirm" |
        "setShowArchiveDeleteConfirm" |
        "handleDeleteFromHistory"
    >;
    prompts: Pick<
        ConfirmModalsProps,
        "showLegacyPrompt" |
        "setShowLegacyPrompt" |
        "handleResetLegacy"
    >;
};

export function useConfirmModalsProps(input: ConfirmModalsBindingInput): ConfirmModalsProps {
    return {
        language: input.language,
        ...input.template,
        ...input.archive,
        ...input.prompts
    };
}
