import { Dispatch, SetStateAction } from "react";
import { t as tr } from "../i18n";
import { AppLanguage, Cycle, Id } from "../types";

type GoalDraft = {
    title: string;
    metric: string;
};

type OnboardingPanelProps = {
    cycle: Cycle;
    language: AppLanguage;
    step: 1 | 2 | 3 | 4;
    setStep: Dispatch<SetStateAction<1 | 2 | 3 | 4>>;
    goalDraft: GoalDraft;
    setGoalDraft: Dispatch<SetStateAction<GoalDraft>>;
    onboardingGoalsComplete: boolean;
    onStartDateChange: (date: string) => void;
    onAddGoal: () => void;
    onDeleteGoal: (goalId: Id) => void;
    updateCycle: (updater: (prev: Cycle) => Cycle) => void;
    onComplete: () => void;
};

export function OnboardingPanel({
    cycle,
    language,
    step,
    setStep,
    goalDraft,
    setGoalDraft,
    onboardingGoalsComplete,
    onStartDateChange,
    onAddGoal,
    onDeleteGoal,
    updateCycle,
    onComplete
}: OnboardingPanelProps) {
    return (
        <section className="card">
            <h2>{tr(language, "onboarding.title")}</h2>
            {step === 1 && (
                <div className="list">
                    <label>
                        {tr(language, "empty.startDate")}
                        <input type="date" value={cycle.startDate} onChange={(e) => onStartDateChange(e.target.value)} />
                    </label>
                    <button className="primary" onClick={() => setStep(2)}>{tr(language, "common.next")}</button>
                </div>
            )}
            {step === 2 && (
                <div className="list">
                    <div className="grid">
                        <label>
                            {tr(language, "onboarding.goal")}
                            <input value={goalDraft.title} onChange={(e) => setGoalDraft({ ...goalDraft, title: e.target.value })} />
                        </label>
                        <label>
                            {tr(language, "onboarding.metricOptional")}
                            <input value={goalDraft.metric} onChange={(e) => setGoalDraft({ ...goalDraft, metric: e.target.value })} />
                        </label>
                    </div>
                    <button className="primary" onClick={onAddGoal} disabled={cycle.goals.length >= 3}>{tr(language, "onboarding.goalAdd")}</button>
                    <div className="list">
                        {cycle.goals.map((goal) => (
                            <div key={goal.id} className="list-item">
                                <div>
                                    <strong>{goal.title}</strong>
                                    <div className="muted">{goal.metric ?? ""}</div>
                                </div>
                                <button onClick={() => onDeleteGoal(goal.id)}>{tr(language, "common.delete")}</button>
                            </div>
                        ))}
                    </div>
                    <button className="primary" onClick={() => setStep(3)} disabled={!onboardingGoalsComplete}>{tr(language, "common.next")}</button>
                </div>
            )}
            {step === 3 && (
                <div className="list">
                    <label>
                        {tr(language, "onboarding.visionOptional")}
                        <textarea value={cycle.vision} onChange={(e) => updateCycle((prev) => ({ ...prev, vision: e.target.value }))} />
                    </label>
                    <button className="primary" onClick={onComplete}>{tr(language, "common.done")}</button>
                </div>
            )}
        </section>
    );
}
