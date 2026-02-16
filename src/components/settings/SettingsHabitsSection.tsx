import { useState } from "react";
import { Check, Pencil, Sparkles, Trash2, X } from "../ui/icons";
import { AppLanguage, Cycle, Habit } from "../../types";
import { t as tr } from "../../i18n";
import { toIsoDate, uid } from "../../utils";
import { Icon } from "../ui/Icon";
import { DEFAULT_HABIT_ICON_KEY, HABIT_ICON_OPTIONS, normalizeHabitIconKey, resolveHabitIcon } from "../ui/habitIcons";

type SettingsHabitsSectionProps = {
    cycle: Cycle | null;
    language: AppLanguage;
    readOnly: boolean;
    habits: Habit[];
    setHabits: (habits: Habit[]) => void;
    habitLog: Record<string, string[]>;
    setHabitLog: (log: Record<string, string[]>) => void;
};

export function SettingsHabitsSection({
    cycle,
    language,
    readOnly,
    habits,
    setHabits,
    habitLog,
    setHabitLog
}: SettingsHabitsSectionProps) {
    const [showHabitForm, setShowHabitForm] = useState(false);
    const [habitTitle, setHabitTitle] = useState("");
    const [habitFreq, setHabitFreq] = useState<"daily" | "custom">("daily");
    const [habitCustomDays, setHabitCustomDays] = useState<number[]>([]);
    const [habitStartDate, setHabitStartDate] = useState(() => toIsoDate(new Date()));
    const [habitGoalType, setHabitGoalType] = useState<"open" | "target">("open");
    const [habitGoalTarget, setHabitGoalTarget] = useState<string>("30");
    const [habitGoalUnit, setHabitGoalUnit] = useState<string>("");
    const [habitIconKey, setHabitIconKey] = useState<string>(DEFAULT_HABIT_ICON_KEY);
    const [editingHabitId, setEditingHabitId] = useState<Habit["id"] | null>(null);
    const [habitEditTitle, setHabitEditTitle] = useState("");
    const [habitEditIconKey, setHabitEditIconKey] = useState<string>(DEFAULT_HABIT_ICON_KEY);

    if (!cycle) return null;

    const weekdayShortLabels = language === "de"
        ? ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"]
        : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    const getFreqLabel = (freq: Habit["frequency"]) => {
        if (freq === "daily") return tr(language, "settings.daily");
        if (freq === "weekdays") return tr(language, "settings.weekdays");
        if (Array.isArray(freq)) {
            return freq.map((day) => weekdayShortLabels[day]).join(", ");
        }
        return "";
    };

    const handleAddHabit = () => {
        if (readOnly) return;
        if (!habitTitle.trim()) return;
        if (habitFreq === "custom" && habitCustomDays.length === 0) return;
        const today = toIsoDate(new Date());
        const parsedGoalTarget = Number.parseInt(habitGoalTarget, 10);
        const normalizedGoalTarget = Number.isFinite(parsedGoalTarget)
            ? Math.max(1, parsedGoalTarget)
            : 1;

        const goal: Habit["goal"] = habitGoalType === "target"
            ? { type: "target", target: normalizedGoalTarget, unit: habitGoalUnit.trim() }
            : { type: "open" };

        const newHabit: Habit = {
            id: uid(),
            title: habitTitle.trim(),
            emoji: normalizeHabitIconKey(habitIconKey),
            frequency: habitFreq === "custom" ? habitCustomDays : habitFreq,
            activeFrom: 1,
            activeTo: 12,
            startedAt: habitStartDate,
            createdAt: today,
            goal
        };

        setHabits([...habits, newHabit]);

        setHabitTitle("");
        setHabitFreq("daily");
        setHabitCustomDays([]);
        setHabitStartDate(toIsoDate(new Date()));
        setHabitIconKey(DEFAULT_HABIT_ICON_KEY);
        setShowHabitForm(false);
    };

    const handleDeleteHabit = (id: Habit["id"]) => {
        if (readOnly) return;
        if (window.confirm(tr(language, "settings.confirmDeleteHabit"))) {
            setHabits(habits.filter((habit) => habit.id !== id));
            if (editingHabitId === id) {
                setEditingHabitId(null);
            }
            const nextLog: Record<string, string[]> = {};
            Object.entries(habitLog).forEach(([date, ids]) => {
                const filtered = ids.filter((habitId) => habitId !== id);
                if (filtered.length > 0) nextLog[date] = filtered;
            });
            setHabitLog(nextLog);
        }
    };

    const startHabitEdit = (habit: Habit) => {
        if (readOnly) return;
        setEditingHabitId(habit.id);
        setHabitEditTitle(habit.title);
        setHabitEditIconKey(normalizeHabitIconKey(habit.emoji));
    };

    const cancelHabitEdit = () => {
        setEditingHabitId(null);
        setHabitEditTitle("");
        setHabitEditIconKey(DEFAULT_HABIT_ICON_KEY);
    };

    const saveHabitEdit = () => {
        if (readOnly || !editingHabitId || !habitEditTitle.trim()) return;
        const nextHabits = habits.map((habit) => {
            if (habit.id !== editingHabitId) return habit;
            return {
                ...habit,
                title: habitEditTitle.trim(),
                emoji: normalizeHabitIconKey(habitEditIconKey)
            };
        });
        setHabits(nextHabits);
        cancelHabitEdit();
    };

    return (
        <div className="settings-section">
            <h3 className="settings-section-title-with-icon">
                <Icon icon={Sparkles} size={16} />
                {tr(language, "common.habits")}
            </h3>
            {habits.length > 0 ? (
                <div className="habit-settings-list">
                    {habits.map((habit) => {
                        const isEditing = editingHabitId === habit.id;
                        return (
                            <div key={habit.id} className="habit-settings-item">
                                <div className={`habit-settings-item-info ${isEditing ? "habit-settings-item-info-edit" : ""}`}>
                                    {isEditing ? (
                                        <>
                                            <input
                                                className="habit-settings-item-input"
                                                value={habitEditTitle}
                                                onChange={(event) => setHabitEditTitle(event.target.value)}
                                                onKeyDown={(event) => {
                                                    if (event.key === "Enter") saveHabitEdit();
                                                    if (event.key === "Escape") cancelHabitEdit();
                                                }}
                                                placeholder={tr(language, "settings.habitNamePlaceholder")}
                                                disabled={readOnly}
                                                autoFocus
                                            />
                                            <div className="habit-emoji-picker habit-emoji-picker-compact">
                                                {HABIT_ICON_OPTIONS.map((option) => (
                                                    <button
                                                        key={`edit-${habit.id}-${option.key}`}
                                                        type="button"
                                                        className={`habit-emoji-btn ${habitEditIconKey === option.key ? "selected" : ""}`}
                                                        disabled={readOnly}
                                                        onClick={() => setHabitEditIconKey(option.key)}
                                                        title={tr(language, option.labelKey)}
                                                        aria-label={tr(language, option.labelKey)}
                                                    >
                                                        <Icon icon={option.icon} size={16} className="habit-emoji-icon" />
                                                    </button>
                                                ))}
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <span className="emoji"><Icon icon={resolveHabitIcon(habit.emoji)} size={18} /></span>
                                            <div>
                                                <div className="title">{habit.title}</div>
                                                <div className="meta">
                                                    {getFreqLabel(habit.frequency)}
                                                    {habit.goal?.type === "target" && ` · ${tr(language, "settings.goal")}: ${habit.goal.target} ${habit.goal.unit || ""}`}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                                <div className="habit-settings-item-actions">
                                    {isEditing ? (
                                        <>
                                            <button className="icon-btn" disabled={readOnly || !habitEditTitle.trim()} onClick={saveHabitEdit} aria-label={tr(language, "common.save")} title={tr(language, "common.save")}>
                                                <Icon icon={Check} size={16} />
                                            </button>
                                            <button className="icon-btn" onClick={cancelHabitEdit} aria-label={tr(language, "common.cancel")} title={tr(language, "common.cancel")}>
                                                <Icon icon={X} size={16} />
                                            </button>
                                        </>
                                    ) : (
                                        <button className="icon-btn" disabled={readOnly} onClick={() => startHabitEdit(habit)} aria-label={tr(language, "common.edit")} title={tr(language, "common.edit")}>
                                            <Icon icon={Pencil} size={16} />
                                        </button>
                                    )}
                                    <button className="button ghost-danger" disabled={readOnly} onClick={() => handleDeleteHabit(habit.id)} aria-label={tr(language, "common.delete")} title={tr(language, "common.delete")}>
                                        <Icon icon={Trash2} size={16} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <p className="muted" style={{ padding: "0 8px" }}>{tr(language, "settings.noHabits")}</p>
            )}
            {showHabitForm ? (
                <div className="habit-settings-form">
                    <div className="habit-settings-form-row">
                        <input
                            type="text"
                            placeholder={tr(language, "settings.habitNamePlaceholder")}
                            value={habitTitle}
                            disabled={readOnly}
                            onChange={(event) => setHabitTitle(event.target.value)}
                            onKeyDown={(event) => event.key === "Enter" && handleAddHabit()}
                            autoFocus
                        />
                    </div>
                    <div className="habit-settings-form-row">
                        <label>
                            {tr(language, "settings.habitStartDate")}
                            <input
                                type="date"
                                value={habitStartDate}
                                disabled={readOnly}
                                onChange={(event) => setHabitStartDate(event.target.value)}
                            />
                        </label>
                    </div>
                    <div className="habit-freq-chips">
                        <button
                            className={`habit-freq-chip ${habitFreq === "daily" ? "selected" : ""}`}
                            disabled={readOnly}
                            onClick={() => setHabitFreq("daily")}
                        >{tr(language, "settings.daily")}</button>
                        <button
                            className={`habit-freq-chip ${habitFreq === "custom" ? "selected" : ""}`}
                            disabled={readOnly}
                            onClick={() => setHabitFreq("custom")}
                        >{tr(language, "settings.customDays")}</button>
                    </div>
                    {habitFreq === "custom" && (
                        <div className="habit-freq-chips">
                            {weekdayShortLabels.map((label, index) => (
                                <button
                                    key={label}
                                    className={`habit-freq-chip ${habitCustomDays.includes(index) ? "selected" : ""}`}
                                    disabled={readOnly}
                                    onClick={() => setHabitCustomDays((prev) =>
                                        prev.includes(index) ? prev.filter((day) => day !== index) : [...prev, index]
                                    )}
                                >{label}</button>
                            ))}
                        </div>
                    )}
                    <div className="habit-settings-form-row" style={{ marginTop: "8px", flexDirection: "column", alignItems: "stretch" }}>
                        <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                            {tr(language, "settings.habitIcon")}
                        </label>
                        <div className="habit-emoji-picker">
                            {HABIT_ICON_OPTIONS.map((option) => (
                                <button
                                    key={option.key}
                                    type="button"
                                    className={`habit-emoji-btn ${habitIconKey === option.key ? "selected" : ""}`}
                                    disabled={readOnly}
                                    onClick={() => setHabitIconKey(option.key)}
                                    title={tr(language, option.labelKey)}
                                    aria-label={tr(language, option.labelKey)}
                                >
                                    <Icon icon={option.icon} size={16} className="habit-emoji-icon" />
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="habit-settings-form-row" style={{ marginTop: "12px" }}>
                        <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                            {tr(language, "settings.goalTarget")}
                        </label>
                        <div className="habit-freq-chips">
                            <button
                                className={`habit-freq-chip ${habitGoalType === "open" ? "selected" : ""}`}
                                disabled={readOnly}
                                onClick={() => setHabitGoalType("open")}
                            >{tr(language, "settings.goalOpen")}</button>
                            <button
                                className={`habit-freq-chip ${habitGoalType === "target" ? "selected" : ""}`}
                                disabled={readOnly}
                                onClick={() => setHabitGoalType("target")}
                            >{tr(language, "settings.goalFixed")}</button>
                        </div>
                    </div>

                    {habitGoalType === "target" && (
                        <div className="habit-settings-form-row" style={{ display: "flex", gap: "8px" }}>
                            <input
                                type="number"
                                min="1"
                                placeholder="30"
                                value={habitGoalTarget}
                                disabled={readOnly}
                                onChange={(event) => setHabitGoalTarget(event.target.value)}
                                style={{ width: "80px" }}
                            />
                            <input
                                type="text"
                                placeholder={tr(language, "settings.unitPlaceholder")}
                                value={habitGoalUnit}
                                disabled={readOnly}
                                onChange={(event) => setHabitGoalUnit(event.target.value)}
                                style={{ flex: 1 }}
                            />
                        </div>
                    )}

                    <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "16px" }}>
                        <button className="button" onClick={() => setShowHabitForm(false)}>{tr(language, "common.cancel")}</button>
                        <button
                            className="button accent"
                            onClick={handleAddHabit}
                            disabled={readOnly || !habitTitle.trim() || (habitFreq === "custom" && habitCustomDays.length === 0)}
                        >
                            {tr(language, "common.save")}
                        </button>
                    </div>
                </div>
            ) : (
                <button
                    className="button"
                    style={{ marginTop: "8px" }}
                    disabled={readOnly}
                    onClick={() => setShowHabitForm(true)}
                >{tr(language, "settings.addHabit")}</button>
            )}
        </div>
    );
}
