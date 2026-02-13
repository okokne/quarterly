import { useCallback, useState } from "react";
import { DailyBlockDraft } from "./useDailyBlocks";
import { Id } from "../types";
import { toIsoDate } from "../utils";
import { EntryScreen } from "../components/AppEntryState";

type GoalDraft = {
    title: string;
    metric: string;
};

type TargetDraft = {
    title: string;
    target: number;
    unit: string;
};

export function useAppUiState() {
    const [titleInput, setTitleInput] = useState("");
    const [startDateInput, setStartDateInput] = useState(() => toIsoDate(new Date()));
    const [activeTab, setActiveTab] = useState<"today" | "week" | "stats" | "journal">("today");
    const [selectedDate, setSelectedDate] = useState(() => toIsoDate(new Date()));
    const [selectedWeek, setSelectedWeek] = useState(1);
    const [showSettings, setShowSettings] = useState(false);
    const [showSearchOverlay, setShowSearchOverlay] = useState(false);
    const [showHeaderDetails, setShowHeaderDetails] = useState(false);
    const [showHabitsManager, setShowHabitsManager] = useState(false);
    const [showCycleDrawer, setShowCycleDrawer] = useState(false);
    const openSettings = useCallback(() => {
        setShowSettings(true);
    }, []);

    const [goalDraft, setGoalDraft] = useState<GoalDraft>({ title: "", metric: "" });
    const [targetDraft, setTargetDraft] = useState<TargetDraft>({ title: "", target: 1, unit: "" });
    const [blockDraft, setBlockDraft] = useState<DailyBlockDraft>({
        startTime: "09:00",
        endTime: "10:00",
        title: "",
        linkedTargetId: "",
        amount: 1,
        actual: 0
    });

    const [showDemoConfirm, setShowDemoConfirm] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showArchiveDeleteConfirm, setShowArchiveDeleteConfirm] = useState<Id | null>(null);
    const [showCycleEndPrompt, setShowCycleEndPrompt] = useState(false);
    const [showLegacyPrompt, setShowLegacyPrompt] = useState(false);

    const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
    const [entryScreen, setEntryScreen] = useState<EntryScreen>("welcome");
    const [entryTourStep, setEntryTourStep] = useState(0);
    const [entryEmail, setEntryEmail] = useState("");
    const [entryPassword, setEntryPassword] = useState("");

    const [draggingBlockId, setDraggingBlockId] = useState<Id | null>(null);
    const [draggingTargetId, setDraggingTargetId] = useState<Id | null>(null);

    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [templateNameDraft, setTemplateNameDraft] = useState("");

    const [searchQuery, setSearchQuery] = useState("");

    return {
        titleInput,
        setTitleInput,
        startDateInput,
        setStartDateInput,
        activeTab,
        setActiveTab,
        selectedDate,
        setSelectedDate,
        selectedWeek,
        setSelectedWeek,
        showSettings,
        setShowSettings,
        showSearchOverlay,
        setShowSearchOverlay,
        showHeaderDetails,
        setShowHeaderDetails,
        showHabitsManager,
        setShowHabitsManager,
        showCycleDrawer,
        setShowCycleDrawer,
        openSettings,
        goalDraft,
        setGoalDraft,
        targetDraft,
        setTargetDraft,
        blockDraft,
        setBlockDraft,
        showDemoConfirm,
        setShowDemoConfirm,
        showDeleteConfirm,
        setShowDeleteConfirm,
        showArchiveDeleteConfirm,
        setShowArchiveDeleteConfirm,
        showCycleEndPrompt,
        setShowCycleEndPrompt,
        showLegacyPrompt,
        setShowLegacyPrompt,
        step,
        setStep,
        entryScreen,
        setEntryScreen,
        entryTourStep,
        setEntryTourStep,
        entryEmail,
        setEntryEmail,
        entryPassword,
        setEntryPassword,
        draggingBlockId,
        setDraggingBlockId,
        draggingTargetId,
        setDraggingTargetId,
        showTemplateModal,
        setShowTemplateModal,
        templateNameDraft,
        setTemplateNameDraft,
        searchQuery,
        setSearchQuery
    };
}
