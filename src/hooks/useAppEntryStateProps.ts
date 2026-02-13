import { Dispatch, SetStateAction } from "react";
import { AppLanguage } from "../types";
import { EntryScreen } from "../components/AppEntryState";

type UseAppEntryStatePropsParams = {
    language: AppLanguage;
    awaitingCloudDashboard: boolean;
    entryScreen: EntryScreen;
    setEntryScreen: (screen: EntryScreen) => void;
    entryTourStep: number;
    setEntryTourStep: Dispatch<SetStateAction<number>>;
    syncEnabled: boolean;
    isAuthenticated: boolean;
    cloudEmail: string | null;
    authError: string | null;
    syncError: string | null;
    authMessage: string | null;
    magicLinkRedirectUrl: string | null;
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
    onRequestSyncNow: () => Promise<boolean>;
    onSignOut: () => Promise<void>;
    onSignIn: (email: string, password: string) => Promise<boolean>;
    onSignUp: (email: string, password: string) => Promise<boolean>;
    onRequestMagicLink: (email: string) => Promise<boolean>;
    onCreateCycle: () => void;
    onLoadDemo: () => void;
};

export function useAppEntryStateProps(params: UseAppEntryStatePropsParams) {
    return params;
}
