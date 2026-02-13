import { AppLanguage } from "../types";

type UseAppEntryStatePropsParams = {
    language: AppLanguage;
    awaitingCloudDashboard: boolean;
    syncEnabled: boolean;
    isAuthenticated: boolean;
    cloudEmail: string | null;
    authError: string | null;
    syncError: string | null;
    authMessage: string | null;
    magicLinkRedirectError: string | null;
    authLoading: boolean;
    entryEmail: string;
    setEntryEmail: (value: string) => void;
    entryPassword: string;
    setEntryPassword: (value: string) => void;
    titleInput: string;
    setTitleInput: (value: string) => void;
    startDateInput: string;
    setStartDateInput: (value: string) => void;
    onSignOut: () => Promise<void>;
    onSignIn: (email: string, password: string) => Promise<boolean>;
    onSignUp: (email: string, password: string) => Promise<boolean>;
    onRequestMagicLink: (email: string) => Promise<boolean>;
    onCreateCycle: () => void;
};

export function useAppEntryStateProps(params: UseAppEntryStatePropsParams) {
    return params;
}
