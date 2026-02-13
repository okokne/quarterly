import { useEffect } from "react";

export function useDisableServiceWorkerCache() {
    useEffect(() => {
        if (!("serviceWorker" in navigator)) return;
        navigator.serviceWorker.getRegistrations().then((registrations) => {
            registrations.forEach((registration) => {
                registration.unregister();
            });
        });
    }, []);
}
