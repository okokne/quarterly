import { useState } from "react";
import { AppLanguage, Cycle, Habit } from "../../types";
import { t as tr } from "../../i18n";
import { toIsoDate, uid } from "../../utils";

const HABIT_EMOJI_OPTIONS = [
    "🌅", "💧", "📝", "🧘", "🏋️", "📚", "🍎", "😴", "☕", "🚀",
    "🎯", "🎨", "🎵", "📵", "🧠", "🏃", "🚴", "🥗", "📖", "💻",
    "🧹", "🧽", "🧺", "🪴", "🐶", "🐱", "🧗", "🧘‍♂️", "🧘‍♀️", "🧊",
    "🥤", "🥛", "🥑", "🍳", "🥦", "🫧", "🪥", "🛏️", "🪞", "🧴",
    "🧩", "🎹", "🎸", "🎻", "🪕", "🎤", "🧪", "📈", "✅", "📌"
];

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
    const [habitEmoji, setHabitEmoji] = useState(HABIT_EMOJI_OPTIONS[0]);
    const [habitTitle, setHabitTitle] = useState("");
    const [habitFreq, setHabitFreq] = useState<"daily" | "custom">("daily");
    const [habitCustomDays, setHabitCustomDays] = useState<number[]>([]);
    const [habitStartDate, setHabitStartDate] = useState(() => toIsoDate(new Date()));
    const [habitGoalType, setHabitGoalType] = useState<"open" | "target">("open");
    const [habitGoalTarget, setHabitGoalTarget] = useState<string>("30");
    const [habitGoalUnit, setHabitGoalUnit] = useState<string>("");

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
            emoji: habitEmoji,
            frequency: habitFreq === "custom" ? habitCustomDays : habitFreq,
            activeFrom: 1,
            activeTo: 12,
            startedAt: habitStartDate,
            createdAt: today,
            goal
        };

        setHabits([...habits, newHabit]);

        setHabitTitle("");
        setHabitEmoji(HABIT_EMOJI_OPTIONS[0]);
        setHabitFreq("daily");
        setHabitCustomDays([]);
        setHabitStartDate(toIsoDate(new Date()));
        setShowHabitForm(false);
    };

    const handleDeleteHabit = (id: Habit["id"]) => {
        if (readOnly) return;
        if (window.confirm(tr(language, "settings.confirmDeleteHabit"))) {
            setHabits(habits.filter((habit) => habit.id !== id));
            const nextLog: Record<string, string[]> = {};
            Object.entries(habitLog).forEach(([date, ids]) => {
                const filtered = ids.filter((habitId) => habitId !== id);
                if (filtered.length > 0) nextLog[date] = filtered;
            });
            setHabitLog(nextLog);
        }
    };

    return (
        <div className="settings-section">
            <h3>🔁 {tr(language, "common.habits")}</h3>
            {habits.length > 0 ? (
                <div className="habit-settings-list">
                    {habits.map((habit) => (
                        <div key={habit.id} className="habit-settings-item">
                            <div className="habit-settings-item-info">
                                <span className="emoji">{habit.emoji}</span>
                                <div>
                                    <div className="title">{habit.title}</div>
                                    <div className="meta">
                                        {getFreqLabel(habit.frequency)}
                                        {habit.goal?.type === "target" && ` · ${tr(language, "settings.goal")}: ${habit.goal.target} ${habit.goal.unit || ""}`}
                                    </div>
                                </div>
                            </div>
                            <button className="button ghost-danger" disabled={readOnly} onClick={() => handleDeleteHabit(habit.id)}>🗑️</button>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="muted" style={{ padding: "0 8px" }}>{tr(language, "settings.noHabits")}</p>
            )}
            {showHabitForm ? (
                <div className="habit-settings-form">
                    <div className="habit-emoji-picker">
                        {HABIT_EMOJI_OPTIONS.map((emoji) => (
                            <button
                                key={emoji}
                                className={`habit-emoji-btn ${habitEmoji === emoji ? "selected" : ""}`}
                                disabled={readOnly}
                                onClick={() => setHabitEmoji(emoji)}
                            >{emoji}</button>
                        ))}
                    </div>
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
