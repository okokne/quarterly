import { useCallback } from "react";
import { t as tr } from "../i18n";
import { AppLanguage } from "../types";
import { useSettingsModalBindings } from "./useSettingsModalBindings";

type SettingsBindingsInput = Parameters<typeof useSettingsModalBindings>[0];

type SettingsBindingsWithoutNotifications = Omit<SettingsBindingsInput, "actions"> & {
    actions: Omit<SettingsBindingsInput["actions"], "handleRequestNotifications">;
};

type UseAppSettingsModalPropsParams = SettingsBindingsWithoutNotifications & {
    language: AppLanguage;
};

export function useAppSettingsModalProps({
    language,
    ...bindings
}: UseAppSettingsModalPropsParams) {
    const handleRequestNotifications = useCallback(async () => {
        if (!("Notification" in window)) {
            alert(tr(language, "notify.unsupported"));
            return;
        }

        const permission = await Notification.requestPermission();
        if (permission === "granted") {
            new Notification("Quarterly", {
                body: tr(language, "notify.enabledBody"),
                icon: "/icon.svg"
            });
        }
    }, [language]);

    return useSettingsModalBindings({
        ...bindings,
        actions: {
            ...bindings.actions,
            handleRequestNotifications
        }
    });
}
