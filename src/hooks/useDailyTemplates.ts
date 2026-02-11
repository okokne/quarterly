import { useEffect, useState } from "react";
import { Cycle, DailyBlock, DailyTemplate, DAILY_TEMPLATES_STORAGE_KEY, Id } from "../types";

type UseDailyTemplatesParams = {
    selectedDate: string;
    updateCycle: (updater: (prev: Cycle) => Cycle) => void;
};

function parseTemplates(raw: string | null): DailyTemplate[] {
    if (!raw) return [];
    try {
        return JSON.parse(raw) as DailyTemplate[];
    } catch {
        return [];
    }
}

export function useDailyTemplates({ selectedDate, updateCycle }: UseDailyTemplatesParams) {
    const [templates, setTemplates] = useState<DailyTemplate[]>(() => {
        return parseTemplates(localStorage.getItem(DAILY_TEMPLATES_STORAGE_KEY));
    });

    useEffect(() => {
        try {
            localStorage.setItem(DAILY_TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
        } catch (err) {
            console.error("Failed to persist templates:", err);
        }
    }, [templates]);

    const saveAsTemplate = (name: string, dayBlocks: DailyBlock[]): boolean => {
        if (!name.trim()) return false;

        const blocks = dayBlocks.map((block) => ({
            startTime: block.startTime,
            endTime: block.endTime,
            title: block.title,
            amount: block.amount
        }));
        if (blocks.length === 0) return false;

        const template: DailyTemplate = {
            id: crypto.randomUUID(),
            name: name.trim(),
            blocks
        };
        setTemplates((prev) => [...prev, template]);
        return true;
    };

    const loadTemplate = (template: DailyTemplate) => {
        updateCycle((prev) => {
            const existingBlocks = prev.dailyPlans[selectedDate] ?? [];
            const newBlocks: DailyBlock[] = template.blocks.map((block) => ({
                id: crypto.randomUUID(),
                startTime: block.startTime,
                endTime: block.endTime,
                title: block.title,
                amount: block.amount,
                done: false,
                actual: 0
            }));
            return {
                ...prev,
                dailyPlans: {
                    ...prev.dailyPlans,
                    [selectedDate]: [...existingBlocks, ...newBlocks]
                }
            };
        });
    };

    const deleteTemplate = (templateId: Id) => {
        setTemplates((prev) => prev.filter((template) => template.id !== templateId));
    };

    return {
        templates,
        setTemplates,
        saveAsTemplate,
        loadTemplate,
        deleteTemplate
    };
}
