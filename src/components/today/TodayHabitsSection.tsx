import { CheckSquare, Plus, Square } from "../ui/icons";
import { t as tr } from "../../i18n";
import { AppLanguage, Id } from "../../types";
import { Icon } from "../ui/Icon";
import { resolveHabitIcon } from "../ui/habitIcons";

type TodayHabitsSectionProps = {
    language: AppLanguage;
    isArchiveView: boolean;
    selectedDate: string;
    habitLog: Record<string, string[]>;
    getActiveHabitsForDate: (date: string) => Array<{ id: Id; title: string; emoji: string }>;
    onToggleHabit: (date: string, habitId: Id) => void;
    onDeleteHabit: (habitId: Id) => void;
    onOpenHabitsManager: () => void;
};

export function TodayHabitsSection({
    language,
    isArchiveView,
    selectedDate,
    habitLog,
    getActiveHabitsForDate,
    onToggleHabit,
    onDeleteHabit,
    onOpenHabitsManager
}: TodayHabitsSectionProps) {
    return (
        <div className="subcard">
            <div className="section-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3>{tr(language, "today.habits")}</h3>
                <button
                    onClick={onOpenHabitsManager}
                    className="text-btn"
                    style={{ fontSize: "0.8rem" }}
                >
                    {tr(language, "common.manage")}
                </button>
            </div>

            <div className="habit-toggle-row">
                {getActiveHabitsForDate(selectedDate).map((habit) => {
                    const log = habitLog[selectedDate] ?? [];
                    const done = log.includes(habit.id);
                    return (
                        <button
                            key={habit.id}
                            className={`habit-chip ${done ? "done" : ""}`}
                            onClick={() => onToggleHabit(selectedDate, habit.id)}
                            onContextMenu={(e) => {
                                e.preventDefault();
                                if (isArchiveView) return;
                                if (window.confirm(tr(language, "today.deleteHabitConfirm", { title: habit.title }))) {
                                    onDeleteHabit(habit.id);
                                }
                            }}
                            title={tr(language, "today.deleteOnRightClick", { title: habit.title })}
                        >
                            <span className="habit-chip-emoji"><Icon icon={resolveHabitIcon(habit.emoji)} size={18} /></span>
                            <span className="habit-chip-label">{habit.title}</span>
                            <span className="habit-chip-check">
                                <Icon icon={done ? CheckSquare : Square} size={14} />
                            </span>
                        </button>
                    );
                })}

                <button
                    className="habit-chip add-habit-btn"
                    onClick={onOpenHabitsManager}
                    title={tr(language, "today.newHabit")}
                >
                    <Icon icon={Plus} size={14} />
                    {tr(language, "today.new")}
                </button>
            </div>
        </div>
    );
}
