import { ConfirmModalsProps } from "../components/ConfirmModals";

type ConfirmModalsBindingInput = {
    language: ConfirmModalsProps["language"];
    demo: Pick<
        ConfirmModalsProps,
        "showDemoConfirm" |
        "setShowDemoConfirm" |
        "handleLoadDemo"
    >;
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
        "handleResetLegacy" |
        "showCycleEndPrompt" |
        "setShowCycleEndPrompt" |
        "onOpenCycleDrawer"
    >;
};

export function useConfirmModalsProps(input: ConfirmModalsBindingInput): ConfirmModalsProps {
    return {
        language: input.language,
        ...input.demo,
        ...input.template,
        ...input.archive,
        ...input.prompts
    };
}
