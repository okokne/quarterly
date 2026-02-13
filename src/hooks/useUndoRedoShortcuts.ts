import { useEffect } from "react";

type UseUndoRedoShortcutsParams = {
    onUndo: () => void;
    onRedo: () => void;
};

export function useUndoRedoShortcuts({ onUndo, onRedo }: UseUndoRedoShortcutsParams) {
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (!(event.metaKey || event.ctrlKey) || event.key !== "z") return;
            event.preventDefault();
            if (event.shiftKey) {
                onRedo();
                return;
            }
            onUndo();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onRedo, onUndo]);
}
