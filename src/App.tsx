import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import {
  Cycle, Id, WeeklyTarget, DailyTemplate,
  STORAGE_KEY, LEGACY_KEY,
  emptyWeeklyReview, emptyDailyReview, emptyFinalReview
} from "./types";
import {
  uid, toIsoDate, addDays,
  formatRange,
  getWeekIndexForDate,
  loadCycle, saveCycle, buildCycle, buildDemoCycle, migrateCycle,
  cycleReducer
} from "./utils";
import { StatsView } from "./components/StatsView";
import { JournalView } from "./components/JournalView";
import { ConfirmModals } from "./components/ConfirmModals";
import { SettingsModalHost } from "./components/SettingsModalHost";
import { AppHeader } from "./components/AppHeader";
import { AppTabs } from "./components/AppTabs";
import { OnboardingPanel } from "./components/OnboardingPanel";
import { TodayTab } from "./components/TodayTab";
import { WeekTab } from "./components/WeekTab";
import { t as tr } from "./i18n";
import { useGoogleCalendarSetup } from "./hooks/useGoogleCalendarSetup";
import { useHabitsStore } from "./hooks/useHabitsStore";
import { useDailyBlocks } from "./hooks/useDailyBlocks";
import { useWeeklyTargets } from "./hooks/useWeeklyTargets";
import { useDailyTemplates } from "./hooks/useDailyTemplates";
import { useWeekMetrics } from "./hooks/useWeekMetrics";
import { useSettingsModalBindings } from "./hooks/useSettingsModalBindings";
import { usePreferences } from "./hooks/usePreferences";
import { useArchiveHistory } from "./hooks/useArchiveHistory";
import { useCycleSearch } from "./hooks/useCycleSearch";
import { buildPersistedPlannerState } from "./persistence/stateSerializer";
import { usePlannerPersistence } from "./hooks/usePlannerPersistence";
import { usePlannerSync } from "./hooks/usePlannerSync";

export default function App() {
  const [cycleState, dispatch] = useReducer(cycleReducer, {
    present: null,
    past: [],
    future: []
  }, (initial) => {
    const loaded = loadCycle();
    const migrated = loaded ? migrateCycle(loaded) : null;
    return { ...initial, present: migrated };
  });
  const { present: activeCycle, past, future } = cycleState;
  const {
    history,
    setHistory,
    viewingArchiveId,
    setViewingArchiveId,
    isArchiveView,
    cycle
  } = useArchiveHistory({ activeCycle });

  const {
    habits,
    setHabits,
    habitLog,
    setHabitLog,
    getActiveHabitsForDate,
    toggleHabit
  } = useHabitsStore({ activeCycle, isArchiveView });

  const handleDeleteHabit = (habitId: Id) => {
    setHabits((prev) => prev.filter((habit) => habit.id !== habitId));
    setHabitLog((prev) => {
      const next: Record<string, string[]> = {};
      Object.entries(prev).forEach(([date, ids]) => {
        const filtered = ids.filter((id) => id !== habitId);
        if (filtered.length > 0) next[date] = filtered;
      });
      return next;
    });
  };

  const [titleInput, setTitleInput] = useState("");
  const [startDateInput, setStartDateInput] = useState(() => toIsoDate(new Date()));
  const [activeTab, setActiveTab] = useState<"today" | "week" | "stats" | "journal">("today");
  const [selectedDate, setSelectedDate] = useState(() => toIsoDate(new Date()));
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const {
    googleLoading,
    googleConnected,
    setGoogleConnected,
    calendarList,
    setCalendarList,
    selectedCalendarId,
    setSelectedCalendarId
  } = useGoogleCalendarSetup();

  // Unregister Service Worker to fix caching issues
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (let registration of registrations) {
          registration.unregister();
        }
      });
    }
  }, []);
  const [goalDraft, setGoalDraft] = useState({ title: "", metric: "" });
  const [targetDraft, setTargetDraft] = useState({ title: "", target: 1, unit: "" });
  const [blockDraft, setBlockDraft] = useState({ startTime: "09:00", endTime: "10:00", title: "", linkedTargetId: "", amount: 1, actual: 0 });
  const [showDemoConfirm, setShowDemoConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showArchiveDeleteConfirm, setShowArchiveDeleteConfirm] = useState<Id | null>(null);
  const [showCycleEndPrompt, setShowCycleEndPrompt] = useState(false);
  const [showLegacyPrompt, setShowLegacyPrompt] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [draggingBlockId, setDraggingBlockId] = useState<Id | null>(null);
  const [draggingTargetId, setDraggingTargetId] = useState<Id | null>(null);

  // Template modal state
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateNameDraft, setTemplateNameDraft] = useState("");
  const {
    darkMode,
    setDarkMode,
    language,
    setLanguage,
    dateFormat,
    setDateFormat,
    timeFormat,
    setTimeFormat
  } = usePreferences();

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const searchResults = useCycleSearch({ cycle, searchQuery, language });

  useEffect(() => {
    if (activeCycle) {
      saveCycle(activeCycle);
      return;
    }
    localStorage.removeItem(STORAGE_KEY);
  }, [activeCycle]);

  useEffect(() => {
    if (!cycle) return;
    const today = toIsoDate(new Date());
    const weekIndex = getWeekIndexForDate(cycle, today);
    setSelectedWeek(weekIndex);
    const currentWeek = cycle.weeks.find((w) => w.index === weekIndex);
    if (currentWeek) {
      const firstDay = currentWeek.startDate;
      const lastDay = currentWeek.endDate;
      if (today < firstDay || today > lastDay) {
        setSelectedDate(firstDay);
      } else {
        setSelectedDate(today);
      }
    }
  }, [cycle?.id]);

  useEffect(() => {
    if (!cycle) return;
    if (cycle.goals.length > 0 && step < 4) setStep(4);
  }, [cycle?.id, cycle?.goals.length, step]);

  useEffect(() => {
    if (cycle) return;
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) setShowLegacyPrompt(true);
  }, [cycle]);

  const updateCycle = (updater: (prev: Cycle) => Cycle) => {
    if (isArchiveView) return;
    dispatch({ type: 'UPDATE', updateFn: updater });
  };

  const handleUndo = () => dispatch({ type: 'UNDO' });
  const handleRedo = () => dispatch({ type: 'REDO' });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  function handleLoadDemo() {
    const demo = buildDemoCycle();
    dispatch({ type: 'SET', payload: demo });
    setActiveTab("today");
    setSelectedWeek(1);
    setSelectedDate(demo.weeks[0].startDate);
  }

  const handleArchiveCycle = () => {
    if (!activeCycle) return;
    const archivedCycle = { ...activeCycle };
    setHistory(prev => [...prev, archivedCycle]);
    dispatch({ type: 'SET', payload: null });
    localStorage.removeItem(STORAGE_KEY);
    setStep(1);
    // Google Calendar State
    if (googleConnected) {
      setCalendarList([]);
    }
  };

  const handleResetLegacy = () => {
    localStorage.removeItem(LEGACY_KEY);
    setShowLegacyPrompt(false);
  };

  const handleDeleteFromHistory = (id: Id) => {
    setHistory(prev => prev.filter(c => c.id !== id));
    setShowArchiveDeleteConfirm(null);
  };

  // Check for cycle end
  useEffect(() => {
    if (!cycle || !cycle.startDate) return;
    try {
      const endDate = addDays(cycle.startDate, 83); // 12 weeks * 7 days - 1
      const today = toIsoDate(new Date());
      if (today >= endDate && !viewingArchiveId) {
        // Only show if not already shown this session (could use sessionStorage or just local state if acceptable)
        // For now, just show it. User can close it.
        // Better: check if we are exactly on the end date or if user hasn't seen it. 
        // Let's just show it if today > endDate. 
        // To avoid annoying popups every reload, maybe good to check if "finalReview" is missing?
        if (!cycle.finalReview) {
          setShowCycleEndPrompt(true);
        }
      }
    } catch (e) {
      console.error("Date calc error", e);
    }
  }, [cycle, viewingArchiveId]);

  const { weekCompletion, totalWeeklyDone, getWeeklyRemaining } = useWeekMetrics({
    cycle,
    selectedWeek
  });
  const today = toIsoDate(new Date());
  const fallbackWeek = { index: selectedWeek, startDate: today, endDate: today };
  const currentWeek = cycle?.weeks.find((w) => w.index === selectedWeek) ?? fallbackWeek;
  const todayWeekIndex = cycle ? getWeekIndexForDate(cycle, today) : selectedWeek;
  const todayWeek = cycle?.weeks.find((w) => w.index === todayWeekIndex) ?? fallbackWeek;
  const selectedWeekTargets = cycle?.weeklyTargets[selectedWeek] ?? [];

  const reminderDate = cycle ? addDays(todayWeek.startDate, cycle.reminder.dayOffset) : today;
  const showReminder = cycle ? cycle.reminder.enabled && today === reminderDate : false;

  const dayBlocks = cycle?.dailyPlans[selectedDate] ?? [];
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
    updateCycle
  });

  const persistedPlannerState = useMemo(() => buildPersistedPlannerState({
    cycle: activeCycle,
    templates,
    history,
    habits,
    habitLog,
    preferences: {
      darkMode,
      language,
      dateFormat,
      timeFormat,
      selectedCalendarId
    }
  }), [
    activeCycle,
    templates,
    history,
    habits,
    habitLog,
    darkMode,
    language,
    dateFormat,
    timeFormat,
    selectedCalendarId
  ]);

  const applyPersistedState = useCallback((nextState: typeof persistedPlannerState) => {
    dispatch({ type: 'SET', payload: nextState.cycle });
    setTemplates(nextState.templates);
    setHistory(() => nextState.history);
    setHabits(nextState.habits);
    setHabitLog(nextState.habitLog);

    setDarkMode(nextState.preferences.darkMode);
    setLanguage(nextState.preferences.language);
    setDateFormat(nextState.preferences.dateFormat);
    setTimeFormat(nextState.preferences.timeFormat);
    setSelectedCalendarId(nextState.preferences.selectedCalendarId || "primary");
    setViewingArchiveId(null);
  }, [
    setTemplates,
    setHistory,
    setHabits,
    setHabitLog,
    setDarkMode,
    setLanguage,
    setDateFormat,
    setTimeFormat,
    setSelectedCalendarId,
    setViewingArchiveId
  ]);

  const {
    snapshotMetas,
    recoveryCandidate,
    persistenceWarning,
    clearPersistenceWarning,
    dismissRecovery,
    restoreLatestSnapshot
  } = usePlannerPersistence({
    state: persistedPlannerState,
    applyState: applyPersistedState
  });

  const {
    syncEnabled,
    syncStatus,
    isAuthenticated,
    authLoading,
    authError,
    authMessage,
    cloudEmail,
    syncError,
    pendingConflict,
    signUp,
    signIn,
    requestMagicLink,
    signOut,
    requestSyncNow,
    resolveSyncConflict
  } = usePlannerSync({
    state: persistedPlannerState,
    onApplyRemoteState: applyPersistedState
  });

  if (!cycle) {
    return (
      <div className="page">
        <header className="hero">
          <div>
            <p className="eyebrow">12‑Week‑Year Planner</p>
            <h1>{tr(language, "empty.heroTitle")}</h1>
            <p>{tr(language, "empty.heroSubtitle")}</p>
          </div>
        </header>

        <section className="card">
          <h2>{tr(language, "empty.newCycleTitle")}</h2>
          <div className="grid">
            <label>
              {tr(language, "empty.titleOptional")}
              <input value={titleInput} onChange={(e) => setTitleInput(e.target.value)} placeholder="Q2 Fokus & Gesundheit" />
            </label>
            <label>
              {tr(language, "empty.startDate")}
              <input type="date" value={startDateInput} onChange={(e) => setStartDateInput(e.target.value)} />
              <span className="hint">{tr(language, "empty.startDateHint")}</span>
            </label>
          </div>
          <button className="primary" onClick={() => dispatch({ type: 'SET', payload: buildCycle(titleInput, startDateInput) })}>
            {tr(language, "empty.createCycle")}
          </button>
        </section>

        <section className="card">
          <h2>{tr(language, "empty.demoTitle")}</h2>
          <p>{tr(language, "empty.demoDescription")}</p>
          <button onClick={handleLoadDemo}>{tr(language, "empty.loadDemo")}</button>
        </section>
      </div>
    );
  }

  const handleAddGoal = () => {
    if (cycle.goals.length >= 3) return;
    if (!goalDraft.title.trim()) return;
    updateCycle((prev) => ({
      ...prev,
      goals: [...prev.goals, { id: uid(), title: goalDraft.title.trim(), metric: goalDraft.metric.trim() || undefined }]
    }));
    setGoalDraft({ title: "", metric: "" });
  };

  const handleDeleteGoal = (goalId: Id) => {
    updateCycle((prev) => ({
      ...prev,
      goals: prev.goals.filter((g) => g.id !== goalId)
    }));
  };

  const handleAddWeeklyTarget = () => {
    const didAdd = addWeeklyTarget(selectedWeek, targetDraft);
    if (didAdd) {
      setTargetDraft({ title: "", target: 1, unit: "" });
    }
  };

  const handleUpdateWeeklyTarget = (targetId: Id, changes: Partial<WeeklyTarget>) => {
    updateWeeklyTarget(selectedWeek, targetId, changes);
  };

  const handleDeleteWeeklyTarget = (targetId: Id) => {
    deleteWeeklyTarget(selectedWeek, targetId);
  };

  const handleCopyFromPreviousWeek = () => {
    copyFromPreviousWeek(selectedWeek);
  };

  const handleSaveAsTemplate = (name: string) => {
    const didSave = saveAsTemplate(name, dayBlocks);
    if (didSave) {
      setTemplateNameDraft("");
      setShowTemplateModal(false);
    }
  };

  // iCal export handler
  const handleExportCalendar = () => {
    let icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//12-Week-Year Planner//DE
CALSCALE:GREGORIAN
METHOD:PUBLISH
`;

    Object.entries(cycle.dailyPlans).forEach(([date, blocks]) => {
      blocks.forEach((block) => {
        const dateFormatted = date.replace(/-/g, '');
        const startTime = block.startTime.replace(':', '') + '00';
        const endTime = block.endTime.replace(':', '') + '00';
        icsContent += `BEGIN:VEVENT
DTSTART:${dateFormatted}T${startTime}
DTEND:${dateFormatted}T${endTime}
SUMMARY:${block.title}
DESCRIPTION:12-Week-Year Block
UID:${block.id}@12wy-planner
END:VEVENT
`;
      });
    });

    icsContent += 'END:VCALENDAR';

    const blob = new Blob([icsContent], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `12-week-year-${toIsoDate(new Date())}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Browser notification handler
  const handleRequestNotifications = async () => {
    if (!('Notification' in window)) {
      alert(tr(language, "notify.unsupported"));
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      new Notification('12-Week-Year Planner', {
        body: tr(language, "notify.enabledBody"),
        icon: '/icon.svg'
      });
    }
  };

  const settingsModalProps = useSettingsModalBindings({
    core: {
      cycle,
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
      setShowDemoConfirm,
      setShowDeleteConfirm,
      setViewingArchiveId,
      setShowArchiveDeleteConfirm
    },
    actions: {
      dispatch,
      handleRequestNotifications,
      updateCycle
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

  const handleLoadTemplate = (template: DailyTemplate) => {
    loadTemplate(template);
  };

  const handleDeleteTemplate = (templateId: Id) => {
    deleteTemplate(templateId);
  };

  const dailyReview = cycle.dailyReviews[selectedDate] ?? emptyDailyReview;
  const weeklyReview = cycle.weeklyReviews[selectedWeek] ?? emptyWeeklyReview;
  const finalReview = cycle.finalReview ?? emptyFinalReview;

  const totalWeeklyTargets = cycle.weeklyTargets[selectedWeek] ?? [];

  // weekCompletion moved to top

  const onboardingGoalsComplete = cycle.goals.length > 0;
  const onboardingDone = step >= 4;

  return (
    <div className="page">
      {viewingArchiveId && (
        <div className="archive-banner">
          <span>
            {tr(language, "app.archiveBanner", { title: cycle?.title ?? "", range: formatRange(cycle?.startDate ?? "", addDays(cycle?.startDate ?? "", 84), dateFormat, language) })}
            {" · "}
            {tr(language, "common.readOnly")}
          </span>
          <button onClick={() => setViewingArchiveId(null)}>{tr(language, "app.backToCurrent")}</button>
        </div>
      )}
      {recoveryCandidate && !viewingArchiveId && (
        <section className="banner safety-banner">
          <span>
            {tr(language, "app.recoveryBanner", { date: recoveryCandidate.createdAt.slice(0, 10) })}
          </span>
          <div className="banner-actions">
            <button onClick={() => restoreLatestSnapshot()}>{tr(language, "app.recoveryRestore")}</button>
            <button onClick={() => dismissRecovery()}>{tr(language, "common.cancel")}</button>
          </div>
        </section>
      )}
      {persistenceWarning && (
        <section className="banner warning-banner">
          <span>{persistenceWarning}</span>
          <div className="banner-actions">
            <button onClick={() => clearPersistenceWarning()}>{tr(language, "common.done")}</button>
          </div>
        </section>
      )}
      <AppHeader
        title={cycle.title}
        startDate={cycle.startDate}
        selectedWeek={selectedWeek}
        currentWeek={currentWeek}
        onboardingDone={onboardingDone}
        weekCompletion={weekCompletion}
        language={language}
        dateFormat={dateFormat}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchResults={searchResults}
        onSearchResultSelect={(result) => {
          if (result.week) {
            setSelectedWeek(result.week);
            setActiveTab("week");
          } else if (result.date) {
            setSelectedDate(result.date);
            setActiveTab("today");
          }
          setSearchQuery("");
        }}
        canUndo={past.length > 0}
        canRedo={future.length > 0}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onOpenSettings={() => setShowSettings(true)}
        syncStatus={syncEnabled ? syncStatus : undefined}
      />

      <SettingsModalHost show={showSettings} props={settingsModalProps} />

      {showReminder && (
        <section className="banner">{tr(language, "app.bannerReminder")}</section>
      )}

      {!onboardingDone && (
        <OnboardingPanel
          cycle={cycle}
          language={language}
          step={step}
          setStep={setStep}
          goalDraft={goalDraft}
          setGoalDraft={setGoalDraft}
          onboardingGoalsComplete={onboardingGoalsComplete}
          onStartDateChange={(date) => updateCycle((prev) => buildCycle(prev.title ?? "", date))}
          onAddGoal={handleAddGoal}
          onDeleteGoal={handleDeleteGoal}
          updateCycle={updateCycle}
          onComplete={() => {
            setStep(4);
            setActiveTab("week");
          }}
        />
      )}

      {onboardingDone && (
        <AppTabs
          language={language}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
      )}

      {isArchiveView && (
        <section className="banner readonly-banner">{tr(language, "app.archiveReadOnlyMode")}</section>
      )}

      {onboardingDone && activeTab === "today" && (
        <TodayTab
          cycle={cycle}
          language={language}
          dateFormat={dateFormat}
          timeFormat={timeFormat}
          isArchiveView={isArchiveView}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          selectedWeek={selectedWeek}
          setSelectedWeek={setSelectedWeek}
          currentWeek={currentWeek}
          selectedWeekTargets={selectedWeekTargets}
          blockDraft={blockDraft}
          setBlockDraft={setBlockDraft}
          dayBlocks={dayBlocks}
          templates={templates}
          onAddBlock={handleAddBlock}
          onOpenTemplateModal={() => setShowTemplateModal(true)}
          onLoadTemplate={handleLoadTemplate}
          onDeleteTemplate={handleDeleteTemplate}
          draggingBlockId={draggingBlockId}
          setDraggingBlockId={setDraggingBlockId}
          onReorderBlocks={handleReorderBlocks}
          onUpdateBlock={handleUpdateBlock}
          onDeleteBlock={handleDeleteBlock}
          getWeeklyRemaining={getWeeklyRemaining}
          totalWeeklyDone={totalWeeklyDone}
          getActiveHabitsForDate={getActiveHabitsForDate}
          habitLog={habitLog}
          onToggleHabit={toggleHabit}
          onDeleteHabit={handleDeleteHabit}
          onOpenSettings={() => setShowSettings(true)}
          dailyReview={dailyReview}
          updateCycle={updateCycle}
        />
      )}

      {onboardingDone && activeTab === "week" && (
        <WeekTab
          cycle={cycle}
          language={language}
          dateFormat={dateFormat}
          isArchiveView={isArchiveView}
          selectedWeek={selectedWeek}
          setSelectedWeek={setSelectedWeek}
          goalDraft={goalDraft}
          setGoalDraft={setGoalDraft}
          onAddGoal={handleAddGoal}
          onDeleteGoal={handleDeleteGoal}
          updateCycle={updateCycle}
          targetDraft={targetDraft}
          setTargetDraft={setTargetDraft}
          onAddWeeklyTarget={handleAddWeeklyTarget}
          onCopyFromPreviousWeek={handleCopyFromPreviousWeek}
          totalWeeklyTargets={totalWeeklyTargets}
          draggingTargetId={draggingTargetId}
          setDraggingTargetId={setDraggingTargetId}
          onReorderTargets={handleReorderTargets}
          onUpdateWeeklyTarget={handleUpdateWeeklyTarget}
          onDeleteWeeklyTarget={handleDeleteWeeklyTarget}
          totalWeeklyDone={totalWeeklyDone}
          weeklyReview={weeklyReview}
          finalReview={finalReview}
        />
      )}

      {onboardingDone && activeTab === "stats" && (
        <StatsView
          cycle={cycle}
          habits={habits}
          habitLog={habitLog}
          onToggleHabitForDate={toggleHabit}
          onDeleteHabit={handleDeleteHabit}
          readOnly={isArchiveView}
          language={language}
          selectedWeek={selectedWeek}
          setSelectedWeek={setSelectedWeek}
          setActiveTab={setActiveTab}
        />
      )}

      {onboardingDone && activeTab === "journal" && (
        <JournalView
          cycle={cycle}
          language={language}
          dateFormat={dateFormat}
          readOnly={isArchiveView}
          setSelectedWeek={setSelectedWeek}
          setSelectedDate={setSelectedDate}
          setActiveTab={setActiveTab}
          updateCycle={updateCycle}
        />
      )}

      <ConfirmModals
        language={language}
        showDemoConfirm={showDemoConfirm}
        setShowDemoConfirm={setShowDemoConfirm}
        handleLoadDemo={handleLoadDemo}
        showTemplateModal={showTemplateModal}
        setShowTemplateModal={setShowTemplateModal}
        templateNameDraft={templateNameDraft}
        setTemplateNameDraft={setTemplateNameDraft}
        handleSaveAsTemplate={handleSaveAsTemplate}
        showDeleteConfirm={showDeleteConfirm}
        setShowDeleteConfirm={setShowDeleteConfirm}
        handleArchiveCycle={handleArchiveCycle}
        showLegacyPrompt={showLegacyPrompt}
        setShowLegacyPrompt={setShowLegacyPrompt}
        handleResetLegacy={handleResetLegacy}
        showArchiveDeleteConfirm={showArchiveDeleteConfirm}
        setShowArchiveDeleteConfirm={setShowArchiveDeleteConfirm}
        handleDeleteFromHistory={handleDeleteFromHistory}
        showCycleEndPrompt={showCycleEndPrompt}
        setShowCycleEndPrompt={setShowCycleEndPrompt}
        setShowSettings={setShowSettings}
      />
    </div >
  );
}
