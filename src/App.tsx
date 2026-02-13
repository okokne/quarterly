import { useCallback, useMemo, useReducer } from "react";
import { Cycle } from "./types";
import { migrateCycle, cycleReducer } from "./utils";
import { ConfirmModals } from "./components/ConfirmModals";
import { SettingsModalHost } from "./components/SettingsModalHost";
import { AppHeader } from "./components/AppHeader";
import { AppDashboardContent } from "./components/AppDashboardContent";
import { AppEntryState } from "./components/AppEntryState";
import { AppStateBanners } from "./components/AppStateBanners";
import { SearchOverlay } from "./components/SearchOverlay";
import { HeaderDetailsPanel } from "./components/HeaderDetailsPanel";
import { HabitsManagerSheet } from "./components/HabitsManagerSheet";
import { CycleDrawer } from "./components/CycleDrawer";
import { useGoogleCalendarSetup } from "./hooks/useGoogleCalendarSetup";
import { useHabitsStore } from "./hooks/useHabitsStore";
import { useDailyBlocks } from "./hooks/useDailyBlocks";
import { useWeeklyTargets } from "./hooks/useWeeklyTargets";
import { useDailyTemplates } from "./hooks/useDailyTemplates";
import { useWeekMetrics } from "./hooks/useWeekMetrics";
import { useAppActions } from "./hooks/useAppActions";
import { useAppCycleActions } from "./hooks/useAppCycleActions";
import { useAppSettingsModalProps } from "./hooks/useAppSettingsModalProps";
import { usePreferences } from "./hooks/usePreferences";
import { useArchiveHistory } from "./hooks/useArchiveHistory";
import { useCycleSearch } from "./hooks/useCycleSearch";
import { useHeaderSearchNavigation } from "./hooks/useHeaderSearchNavigation";
import { useConfirmModalsProps } from "./hooks/useConfirmModalsProps";
import { useAppCycleEffects } from "./hooks/useAppCycleEffects";
import { useUndoRedoShortcuts } from "./hooks/useUndoRedoShortcuts";
import { useDisableServiceWorkerCache } from "./hooks/useDisableServiceWorkerCache";
import { useAppPlannerDerived } from "./hooks/useAppPlannerDerived";
import { useAppEntryStateProps } from "./hooks/useAppEntryStateProps";
import { useAppDashboardContentProps } from "./hooks/useAppDashboardContentProps";
import { useAppUiState } from "./hooks/useAppUiState";
import { useAppStorageScope } from "./hooks/useAppStorageScope";
import { useAppDashboardDerived } from "./hooks/useAppDashboardDerived";
import { readPersistedPlannerStateFromLocalStorage } from "./persistence/stateSerializer";
import { useAppSyncPersistence } from "./hooks/useAppSyncPersistence";

export default function App() {
  const { initialStorageScope, storageScope, handleStorageScopeChange } = useAppStorageScope();

  const initialPersistedState = useMemo(
    () => readPersistedPlannerStateFromLocalStorage(undefined, initialStorageScope),
    [initialStorageScope]
  );

  const [cycleState, dispatch] = useReducer(cycleReducer, {
    present: initialPersistedState.cycle,
    past: [],
    future: []
  }, (initial) => ({
    ...initial,
    present: initial.present ? migrateCycle(initial.present) : null
  }));
  const { present: activeCycle, past, future } = cycleState;
  const {
    history,
    setHistory,
    viewingArchiveId,
    setViewingArchiveId,
    isArchiveView,
    cycle
  } = useArchiveHistory({ activeCycle, storageScope });

  const {
    habits,
    setHabits,
    habitLog,
    setHabitLog,
    getActiveHabitsForDate,
    toggleHabit,
    deleteHabit
  } = useHabitsStore({ activeCycle, isArchiveView, storageScope });

  const {
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
  } = useAppUiState();
  const {
    googleLoading,
    googleConnected,
    setGoogleConnected,
    calendarList,
    setCalendarList,
    selectedCalendarId,
    setSelectedCalendarId
  } = useGoogleCalendarSetup({ storageScope });

  useDisableServiceWorkerCache();
  const {
    darkMode,
    setDarkMode,
    language,
    setLanguage,
    dateFormat,
    setDateFormat,
    timeFormat,
    setTimeFormat
  } = usePreferences({ storageScope });

  const searchResults = useCycleSearch({ cycle, searchQuery, language });
  const onHeaderSearchResultSelect = useHeaderSearchNavigation({
    setSelectedWeek,
    setSelectedDate,
    setActiveTab,
    setSearchQuery
  });
  useAppCycleEffects({
    cycle,
    viewingArchiveId,
    step,
    setStep,
    setSelectedWeek,
    setSelectedDate,
    setShowLegacyPrompt,
    setShowCycleEndPrompt
  });

  const updateCycle = (updater: (prev: Cycle) => Cycle) => {
    if (isArchiveView) return;
    dispatch({ type: 'UPDATE', updateFn: updater });
  };

  const handleUndo = useCallback(() => dispatch({ type: "UNDO" }), []);
  const handleRedo = useCallback(() => dispatch({ type: "REDO" }), []);
  useUndoRedoShortcuts({
    onUndo: handleUndo,
    onRedo: handleRedo
  });

  const {
    handleLoadDemo,
    handleCreateCycle,
    handleArchiveCycle,
    handleResetLegacy,
    handleDeleteFromHistory
  } = useAppCycleActions({
    activeCycle,
    googleConnected,
    titleInput,
    startDateInput,
    setHistory,
    dispatch,
    setStep,
    setActiveTab,
    setSelectedWeek,
    setSelectedDate,
    setCalendarList,
    setShowLegacyPrompt,
    setShowArchiveDeleteConfirm
  });

  const {
    currentWeek,
    selectedWeekTargets,
    totalWeeklyTargets,
    dayBlocks,
    showReminder
  } = useAppPlannerDerived({
    cycle,
    selectedWeek,
    selectedDate
  });
  const { weekCompletion, totalWeeklyDone, getWeeklyRemaining } = useWeekMetrics({
    cycle,
    selectedWeek
  });
  const {
    addBlock,
    updateBlock: handleUpdateBlock,
    deleteBlock: handleDeleteBlock,
    reorderBlocks: handleReorderBlocks
  } = useDailyBlocks({
    cycle,
    googleConnected,
    selectedCalendarId,
    updateCycle
  });

  const handleAddBlock = async (date: string) => {
    const didAdd = await addBlock(date, blockDraft);
    if (didAdd) {
      setBlockDraft({ startTime: "09:00", endTime: "10:00", title: "", linkedTargetId: "", amount: 1, actual: 0 });
    }
  };
  const {
    addWeeklyTarget,
    updateWeeklyTarget,
    deleteWeeklyTarget,
    reorderTargets: handleReorderTargets,
    copyFromPreviousWeek
  } = useWeeklyTargets({
    cycle,
    updateCycle
  });
  const {
    templates,
    setTemplates,
    saveAsTemplate,
    loadTemplate,
    deleteTemplate
  } = useDailyTemplates({
    selectedDate,
    updateCycle,
    storageScope
  });

  const {
    syncEnabled,
    syncStatus,
    isAuthenticated,
    authLoading,
    authError,
    authMessage,
    magicLinkRedirectUrl,
    magicLinkRedirectError,
    cloudEmail,
    syncError,
    pendingConflict,
    signUp,
    signIn,
    requestMagicLink,
    signOut,
    requestSyncNow,
    resolveSyncConflict,
    snapshotMetas,
    recoveryCandidate,
    persistenceWarning,
    clearPersistenceWarning,
    dismissRecovery,
    restoreLatestSnapshot,
    awaitingCloudDashboard
  } = useAppSyncPersistence({
    activeCycle,
    templates,
    history,
    habits,
    habitLog,
    darkMode,
    language,
    dateFormat,
    timeFormat,
    selectedCalendarId,
    dispatch,
    setTemplates,
    setHistory,
    setHabits,
    setHabitLog,
    setDarkMode,
    setLanguage,
    setDateFormat,
    setTimeFormat,
    setSelectedCalendarId,
    setViewingArchiveId,
    storageScope,
    onStorageScopeChange: handleStorageScopeChange,
    hasCycle: Boolean(cycle)
  });
  const {
    dashboardCycle,
    dailyReview,
    weeklyReview,
    onboardingGoalsComplete,
    onboardingDone
  } = useAppDashboardDerived({
    cycle,
    activeCycle,
    titleInput,
    startDateInput,
    selectedDate,
    selectedWeek,
    step
  });
  const {
    handleAddGoal,
    handleDeleteGoal,
    handleAddWeeklyTarget,
    handleUpdateWeeklyTarget,
    handleDeleteWeeklyTarget,
    handleCopyFromPreviousWeek,
    handleSaveAsTemplate,
    handleLoadTemplate,
    handleDeleteTemplate
  } = useAppActions({
    cycle,
    goalDraft,
    setGoalDraft,
    updateCycle,
    selectedWeek,
    targetDraft,
    setTargetDraft,
    addWeeklyTarget,
    updateWeeklyTarget,
    deleteWeeklyTarget,
    copyFromPreviousWeek,
    saveAsTemplate,
    dayBlocks,
    setTemplateNameDraft,
    setShowTemplateModal,
    loadTemplate,
    deleteTemplate
  });

  const settingsModalProps = useAppSettingsModalProps({
    language,
    core: {
      activeCycle,
      readOnly: isArchiveView,
      templates,
      history,
      darkMode,
      language,
      dateFormat,
      timeFormat
    },
    google: {
      googleLoading,
      googleConnected,
      calendarList,
      selectedCalendarId
    },
    setters: {
      setDarkMode,
      setLanguage,
      setDateFormat,
      setTimeFormat,
      setGoogleConnected,
      setCalendarList,
      setSelectedCalendarId,
      setTemplates,
      setHistory,
      setShowSettings,
      setViewingArchiveId
    },
    actions: {
      dispatch
    },
    habits: {
      habits,
      setHabits,
      habitLog,
      setHabitLog
    },
    persistence: {
      snapshotMetas
    },
    sync: {
      syncEnabled,
      syncStatus,
      isAuthenticated,
      authLoading,
      authError,
      authMessage,
      magicLinkRedirectUrl,
      magicLinkRedirectError,
      cloudEmail,
      syncError,
      pendingConflict,
      onSignUp: signUp,
      onSignIn: signIn,
      onRequestMagicLink: requestMagicLink,
      onSignOut: signOut,
      onSyncNow: requestSyncNow,
      onResolveSyncConflict: resolveSyncConflict
    }
  });
  const confirmModalsProps = useConfirmModalsProps({
    language,
    demo: {
      showDemoConfirm,
      setShowDemoConfirm,
      handleLoadDemo
    },
    template: {
      showTemplateModal,
      setShowTemplateModal,
      templateNameDraft,
      setTemplateNameDraft,
      handleSaveAsTemplate
    },
    archive: {
      showDeleteConfirm,
      setShowDeleteConfirm,
      handleArchiveCycle,
      showArchiveDeleteConfirm,
      setShowArchiveDeleteConfirm,
      handleDeleteFromHistory
    },
    prompts: {
      showLegacyPrompt,
      setShowLegacyPrompt,
      handleResetLegacy,
      showCycleEndPrompt,
      setShowCycleEndPrompt,
      onOpenCycleDrawer: () => setShowCycleDrawer(true)
    }
  });
  const dashboardContentProps = useAppDashboardContentProps({
    cycle: dashboardCycle,
    language,
    dateFormat,
    timeFormat,
    isArchiveView,
    activeTab,
    setActiveTab,
    step,
    setStep,
    onboardingGoalsComplete,
    goalDraft,
    setGoalDraft,
    targetDraft,
    setTargetDraft,
    blockDraft,
    setBlockDraft,
    selectedDate,
    setSelectedDate,
    selectedWeek,
    setSelectedWeek,
    selectedWeekTargets,
    totalWeeklyTargets,
    dayBlocks,
    templates,
    draggingBlockId,
    setDraggingBlockId,
    draggingTargetId,
    setDraggingTargetId,
    habits,
    habitLog,
    dailyReview,
    weeklyReview,
    showReminder,
    updateCycle,
    onAddGoal: handleAddGoal,
    onDeleteGoal: handleDeleteGoal,
    onAddWeeklyTarget: handleAddWeeklyTarget,
    onCopyFromPreviousWeek: handleCopyFromPreviousWeek,
    onUpdateWeeklyTarget: handleUpdateWeeklyTarget,
    onDeleteWeeklyTarget: handleDeleteWeeklyTarget,
    onReorderTargets: handleReorderTargets,
    onAddBlock: handleAddBlock,
    onOpenTemplateModal: () => setShowTemplateModal(true),
    onLoadTemplate: handleLoadTemplate,
    onDeleteTemplate: handleDeleteTemplate,
    onReorderBlocks: handleReorderBlocks,
    onUpdateBlock: handleUpdateBlock,
    onDeleteBlock: handleDeleteBlock,
    getWeeklyRemaining,
    totalWeeklyDone,
    getActiveHabitsForDate,
    onToggleHabit: toggleHabit,
    onDeleteHabit: deleteHabit,
    onOpenHabitsManager: () => setShowHabitsManager(true)
  });
  const entryStateProps = useAppEntryStateProps({
    language,
    awaitingCloudDashboard,
    entryScreen,
    setEntryScreen,
    entryTourStep,
    setEntryTourStep,
    syncEnabled,
    isAuthenticated,
    cloudEmail,
    authError,
    syncError,
    authMessage,
    magicLinkRedirectUrl,
    magicLinkRedirectError,
    authLoading,
    entryEmail,
    setEntryEmail,
    entryPassword,
    setEntryPassword,
    titleInput,
    setTitleInput,
    startDateInput,
    setStartDateInput,
    onRequestSyncNow: requestSyncNow,
    onSignOut: signOut,
    onSignIn: signIn,
    onSignUp: signUp,
    onRequestMagicLink: requestMagicLink,
    onCreateCycle: handleCreateCycle,
    onLoadDemo: handleLoadDemo
  });

  if (!cycle) {
    return (
      <AppEntryState {...entryStateProps} />
    );
  }

  return (
    <div className="page">
      <AppStateBanners
        viewingArchiveId={viewingArchiveId}
        cycleTitle={cycle.title}
        cycleStartDate={cycle.startDate}
        language={language}
        dateFormat={dateFormat}
        onExitArchive={() => setViewingArchiveId(null)}
        recoveryCandidate={recoveryCandidate}
        onRestoreLatestSnapshot={restoreLatestSnapshot}
        onDismissRecovery={dismissRecovery}
        persistenceWarning={persistenceWarning}
        onClearPersistenceWarning={clearPersistenceWarning}
      />
      <AppHeader
        title={cycle.title}
        startDate={cycle.startDate}
        selectedWeek={selectedWeek}
        currentWeek={currentWeek}
        language={language}
        dateFormat={dateFormat}
        onOpenCycleDrawer={() => setShowCycleDrawer(true)}
        onOpenSearch={() => setShowSearchOverlay(true)}
        onOpenHeaderDetails={() => setShowHeaderDetails(true)}
        onOpenSettings={openSettings}
        syncStatus={syncEnabled ? syncStatus : undefined}
      />

      <SearchOverlay
        open={showSearchOverlay}
        language={language}
        dateFormat={dateFormat}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchResults={searchResults}
        onClose={() => setShowSearchOverlay(false)}
        onSelectResult={onHeaderSearchResultSelect}
      />

      <HeaderDetailsPanel
        open={showHeaderDetails}
        language={language}
        onboardingDone={onboardingDone}
        selectedWeek={selectedWeek}
        weekCompletion={weekCompletion}
        canUndo={past.length > 0}
        canRedo={future.length > 0}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onClose={() => setShowHeaderDetails(false)}
      />

      <HabitsManagerSheet
        open={showHabitsManager}
        language={language}
        cycle={cycle}
        readOnly={isArchiveView}
        habits={habits}
        setHabits={setHabits}
        habitLog={habitLog}
        setHabitLog={setHabitLog}
        onClose={() => setShowHabitsManager(false)}
      />

      <CycleDrawer
        open={showCycleDrawer}
        language={language}
        dateFormat={dateFormat}
        cycle={cycle}
        history={history}
        readOnly={isArchiveView}
        updateCycle={updateCycle}
        onArchiveRestart={() => {
          setShowCycleDrawer(false);
          setShowDeleteConfirm(true);
        }}
        onViewArchivedCycle={(archiveId) => {
          setShowCycleDrawer(false);
          setViewingArchiveId(archiveId);
        }}
        onDeleteArchivedCycle={(archiveId) => setShowArchiveDeleteConfirm(archiveId)}
        onClose={() => setShowCycleDrawer(false)}
      />

      <SettingsModalHost show={showSettings} props={settingsModalProps} />

      <AppDashboardContent {...dashboardContentProps} />

      <ConfirmModals {...confirmModalsProps} />
    </div >
  );
}
