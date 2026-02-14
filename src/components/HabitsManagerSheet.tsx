import { X } from "lucide-react";
import { AppLanguage, Cycle, Habit } from "../types";
import { t as tr } from "../i18n";
import { SettingsHabitsSection } from "./settings/SettingsHabitsSection";
import { Icon } from "./ui/Icon";

type HabitsManagerSheetProps = {
    open: boolean;
    language: AppLanguage;
    cycle: Cycle | null;
    readOnly: boolean;
    habits: Habit[];
    setHabits: (habits: Habit[]) => void;
    habitLog: Record<string, string[]>;
    setHabitLog: (log: Record<string, string[]>) => void;
    onClose: () => void;
};

export function HabitsManagerSheet({
    open,
    language,
    cycle,
    readOnly,
    habits,
    setHabits,
    habitLog,
    setHabitLog,
    onClose
}: HabitsManagerSheetProps) {
    if (!open) return null;

    return (
        <div className="overlay-backdrop" onClick={onClose}>
            <div className="overlay-card habits-manager-card" onClick={(event) => event.stopPropagation()}>
                <div className="overlay-header">
                    <h3>{tr(language, "common.habits")}</h3>
                    <button className="icon-btn" onClick={onClose} aria-label={tr(language, "common.close")}>
                        <Icon icon={X} />
                    </button>
                </div>
                <SettingsHabitsSection
                    cycle={cycle}
                    language={language}
                    readOnly={readOnly}
                    habits={habits}
                    setHabits={setHabits}
                    habitLog={habitLog}
                    setHabitLog={setHabitLog}
                />
            </div>
        </div>
    );
}
