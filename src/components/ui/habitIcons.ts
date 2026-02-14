import {
    Activity,
    Apple,
    BookOpen,
    Brain,
    Briefcase,
    Dumbbell,
    Heart,
    LucideIcon,
    Moon,
    Phone,
    Sparkles,
    Sunrise,
    Utensils
} from "lucide-react";

export type HabitIconOption = {
    key: string;
    labelKey: string;
    icon: LucideIcon;
};

export const HABIT_ICON_OPTIONS: HabitIconOption[] = [
    { key: "sparkles", labelKey: "settings.habitIconSparkles", icon: Sparkles },
    { key: "activity", labelKey: "settings.habitIconActivity", icon: Activity },
    { key: "dumbbell", labelKey: "settings.habitIconDumbbell", icon: Dumbbell },
    { key: "brain", labelKey: "settings.habitIconBrain", icon: Brain },
    { key: "book", labelKey: "settings.habitIconBook", icon: BookOpen },
    { key: "briefcase", labelKey: "settings.habitIconBriefcase", icon: Briefcase },
    { key: "heart", labelKey: "settings.habitIconHeart", icon: Heart },
    { key: "sunrise", labelKey: "settings.habitIconSunrise", icon: Sunrise },
    { key: "moon", labelKey: "settings.habitIconMoon", icon: Moon },
    { key: "apple", labelKey: "settings.habitIconApple", icon: Apple },
    { key: "utensils", labelKey: "settings.habitIconUtensils", icon: Utensils },
    { key: "phone", labelKey: "settings.habitIconPhone", icon: Phone }
];

const LEGACY_EMOJI_TO_ICON_KEY: Record<string, string> = {
    "🌟": "sparkles",
    "✨": "sparkles",
    "🏃": "activity",
    "🏃‍♂️": "activity",
    "🏃‍♀️": "activity",
    "💪": "dumbbell",
    "🏋️": "dumbbell",
    "🏋️‍♂️": "dumbbell",
    "🏋️‍♀️": "dumbbell",
    "🧠": "brain",
    "📚": "book",
    "📖": "book",
    "💼": "briefcase",
    "❤️": "heart",
    "💙": "heart",
    "☀️": "sunrise",
    "🌅": "sunrise",
    "🌙": "moon",
    "😴": "moon",
    "🍎": "apple",
    "🥗": "utensils",
    "🍽️": "utensils",
    "📞": "phone"
};

const ICON_BY_KEY = new Map<string, LucideIcon>(
    HABIT_ICON_OPTIONS.map((option) => [option.key, option.icon])
);

export const DEFAULT_HABIT_ICON_KEY = "sparkles";

export function normalizeHabitIconKey(value: string | undefined): string {
    const trimmed = value?.trim();
    if (!trimmed) return DEFAULT_HABIT_ICON_KEY;
    if (ICON_BY_KEY.has(trimmed)) return trimmed;
    return LEGACY_EMOJI_TO_ICON_KEY[trimmed] ?? DEFAULT_HABIT_ICON_KEY;
}

export function resolveHabitIcon(value: string | undefined): LucideIcon {
    return ICON_BY_KEY.get(normalizeHabitIconKey(value)) ?? Sparkles;
}

