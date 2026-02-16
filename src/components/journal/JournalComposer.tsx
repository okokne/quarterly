import { CSSProperties, Dispatch, SetStateAction } from "react";
import { Pencil } from "../ui/icons";
import { t as tr } from "../../i18n";
import { AppLanguage, Cycle, ReviewSignal } from "../../types";
import { getWeekLabel } from "../../utils";
import { ComposerType, FilterOption } from "./types";
import { Icon } from "../ui/Icon";

type JournalComposerProps = {
    cycle: Cycle;
    language: AppLanguage;
    readOnly: boolean;
    showComposer: boolean;
    setShowComposer: Dispatch<SetStateAction<boolean>>;
    composerType: ComposerType;
    setComposerType: Dispatch<SetStateAction<ComposerType>>;
    signalOptions: Array<FilterOption<ReviewSignal>>;
    customDate: string;
    setCustomDate: Dispatch<SetStateAction<string>>;
    customTitle: string;
    setCustomTitle: Dispatch<SetStateAction<string>>;
    customContent: string;
    setCustomContent: Dispatch<SetStateAction<string>>;
    customContextId: string;
    setCustomContextId: Dispatch<SetStateAction<string>>;
    customSignals: ReviewSignal[];
    toggleCustomSignal: (signal: ReviewSignal) => void;
    onOpenLabelSettings: () => void;
    dailyDate: string;
    setDailyDate: Dispatch<SetStateAction<string>>;
    dailyGood: string;
    setDailyGood: Dispatch<SetStateAction<string>>;
    dailyBad: string;
    setDailyBad: Dispatch<SetStateAction<string>>;
    weeklyWeek: string;
    setWeeklyWeek: Dispatch<SetStateAction<string>>;
    weeklyGood: string;
    setWeeklyGood: Dispatch<SetStateAction<string>>;
    weeklyBad: string;
    setWeeklyBad: Dispatch<SetStateAction<string>>;
    weeklyChange: string;
    setWeeklyChange: Dispatch<SetStateAction<string>>;
    composerSubmitDisabled: boolean;
    handleCreateEntry: () => void;
};

export function JournalComposer({
    cycle,
    language,
    readOnly,
    showComposer,
    setShowComposer,
    composerType,
    setComposerType,
    signalOptions,
    customDate,
    setCustomDate,
    customTitle,
    setCustomTitle,
    customContent,
    setCustomContent,
    customContextId,
    setCustomContextId,
    customSignals,
    toggleCustomSignal,
    onOpenLabelSettings,
    dailyDate,
    setDailyDate,
    dailyGood,
    setDailyGood,
    dailyBad,
    setDailyBad,
    weeklyWeek,
    setWeeklyWeek,
    weeklyGood,
    setWeeklyGood,
    weeklyBad,
    setWeeklyBad,
    weeklyChange,
    setWeeklyChange,
    composerSubmitDisabled,
    handleCreateEntry
}: JournalComposerProps) {
    if (!showComposer) return null;
    const composerSignalOptions = signalOptions.filter((option) => option.id !== "note");
    const allContextLabels = [
        tr(language, "journal.contextNone"),
        ...((cycle.journalContexts ?? []).map((context) => context.label))
    ];
    const longestContextLabelLength = allContextLabels.reduce(
        (maxLength, label) => Math.max(maxLength, label.trim().length),
        0
    );
    const contextChipWidthCh = Math.min(22, Math.max(11, longestContextLabelLength + 2));

    return (
        <div className="subcard journal-entry-form">
            <h3>{tr(language, "journal.newEntry")}</h3>
            <div className="journal-composer-type-row">
                <button className={`journal-filter-chip ${composerType === "custom" ? "active" : ""}`} onClick={() => setComposerType("custom")}>{tr(language, "journal.filterTypeNote")}</button>
                <button className={`journal-filter-chip ${composerType === "daily" ? "active" : ""}`} onClick={() => setComposerType("daily")}>{tr(language, "journal.filterTypeDaily")}</button>
                <button className={`journal-filter-chip ${composerType === "weekly" ? "active" : ""}`} onClick={() => setComposerType("weekly")}>{tr(language, "journal.filterTypeWeekly")}</button>
            </div>

            {composerType === "custom" && (
                <>
                    <div className="grid">
                        <label>
                            {tr(language, "common.title")}
                            <input
                                value={customTitle}
                                onChange={(e) => setCustomTitle(e.target.value)}
                                placeholder={tr(language, "journal.entryTitlePlaceholder")}
                            />
                        </label>
                        <label>
                            {tr(language, "journal.entryDate")}
                            <input
                                type="date"
                                value={customDate}
                                onChange={(e) => setCustomDate(e.target.value)}
                            />
                        </label>
                    </div>
                    <div className="journal-filter-row">
                        <div className="journal-filter-label-row">
                            <span className="journal-filter-label">{tr(language, "journal.filterContext")}</span>
                            <button
                                type="button"
                                className="journal-label-settings-btn"
                                onClick={onOpenLabelSettings}
                                title={tr(language, "journal.openLabelSettings")}
                                aria-label={tr(language, "journal.openLabelSettings")}
                            >
                                <Icon icon={Pencil} size={13} />
                            </button>
                        </div>
                        <div
                            className="journal-filter-chip-row journal-label-chip-row"
                            style={{ "--journal-label-chip-width": `${contextChipWidthCh}ch` } as CSSProperties}
                        >
                            <button
                                type="button"
                                className={`journal-filter-chip journal-label-chip journal-label-chip-none ${customContextId === "" ? "active" : ""}`}
                                onClick={() => setCustomContextId("")}
                            >
                                {tr(language, "journal.contextNone")}
                            </button>
                            {(cycle.journalContexts ?? []).map((context) => (
                                <button
                                    key={context.id}
                                    type="button"
                                    className={`journal-filter-chip journal-label-chip ${customContextId === context.id ? "active" : ""}`}
                                    style={{ "--journal-context-bg": context.color } as CSSProperties}
                                    onClick={() => setCustomContextId(context.id)}
                                >
                                    {context.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="journal-filter-row">
                        <span className="journal-filter-label">{tr(language, "journal.filterSignals")}</span>
                        <div className="journal-filter-chip-row">
                            {composerSignalOptions.map((option) => (
                                <button
                                    key={option.id}
                                    className={`journal-filter-chip ${customSignals.includes(option.id) ? "active" : ""}`}
                                    onClick={() => toggleCustomSignal(option.id)}
                                >
                                    {tr(language, option.labelKey)}
                                </button>
                            ))}
                        </div>
                    </div>
                    <label>
                        {tr(language, "journal.entryBodyOptional")}
                        <textarea
                            value={customContent}
                            onChange={(e) => setCustomContent(e.target.value)}
                            placeholder={tr(language, "journal.entryBodyPlaceholder")}
                        />
                    </label>
                </>
            )}

            {composerType === "daily" && (
                <>
                    <div className="grid">
                        <label>
                            {tr(language, "journal.entryDate")}
                            <input
                                type="date"
                                value={dailyDate}
                                onChange={(e) => setDailyDate(e.target.value)}
                            />
                        </label>
                    </div>
                    <div className="grid">
                        <label>
                            {tr(language, "review.good")}
                            <textarea
                                value={dailyGood}
                                onChange={(e) => setDailyGood(e.target.value)}
                            />
                        </label>
                        <label>
                            {tr(language, "review.bad")}
                            <textarea
                                value={dailyBad}
                                onChange={(e) => setDailyBad(e.target.value)}
                            />
                        </label>
                    </div>
                </>
            )}

            {composerType === "weekly" && (
                <>
                    <label>
                        {tr(language, "week.select")}
                        <select value={weeklyWeek} onChange={(e) => setWeeklyWeek(e.target.value)}>
                            {cycle.weeks.map((week) => (
                                <option key={week.index} value={week.index}>
                                    {getWeekLabel(cycle, week.index, language)}
                                </option>
                            ))}
                        </select>
                    </label>
                    <div className="grid">
                        <label>
                            {tr(language, "review.good")}
                            <textarea
                                value={weeklyGood}
                                onChange={(e) => setWeeklyGood(e.target.value)}
                            />
                        </label>
                        <label>
                            {tr(language, "review.bad")}
                            <textarea
                                value={weeklyBad}
                                onChange={(e) => setWeeklyBad(e.target.value)}
                            />
                        </label>
                        <label>
                            {tr(language, "review.changeNextWeek")}
                            <textarea
                                value={weeklyChange}
                                onChange={(e) => setWeeklyChange(e.target.value)}
                            />
                        </label>
                    </div>
                </>
            )}

            <div className="button-row">
                <button className="primary" onClick={handleCreateEntry} disabled={readOnly || composerSubmitDisabled}>{tr(language, "common.save")}</button>
                <button onClick={() => setShowComposer(false)}>{tr(language, "common.cancel")}</button>
            </div>
        </div>
    );
}
