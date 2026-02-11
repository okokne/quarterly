import { SettingsModal, SettingsModalProps } from "./SettingsModal";

type SettingsModalHostProps = {
    show: boolean;
    props: SettingsModalProps;
};

export function SettingsModalHost({ show, props }: SettingsModalHostProps) {
    if (!show) return null;
    return <SettingsModal {...props} />;
}
