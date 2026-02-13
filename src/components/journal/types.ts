import { ReviewEntryType, ReviewSignal } from "../../types";

export type FeedTypeFilter = "all" | ReviewEntryType;
export type FeedRangeFilter = "all" | "current_week" | "current_month" | "quarter";
export type ComposerType = "daily" | "weekly" | "custom";

export type FilterOption<T extends string> = {
    id: T;
    labelKey: string;
};

export const SIGNAL_LABEL_SUFFIX: Record<ReviewSignal, string> = {
    win: "Win",
    challenge: "Challenge",
    next_step: "NextStep",
    note: "Note"
};
