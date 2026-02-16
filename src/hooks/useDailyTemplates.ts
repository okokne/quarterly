import { useEffect, useState } from "react";
import { Cycle, DailyBlock, DailyTemplate, DAILY_TEMPLATES_STORAGE_KEY, Id, StorageScope } from "../types";
import { readScopedStorageValue, writeScopedStorageValue } from "../persistence/storageScope";

type UseDailyTemplatesParams = {
    selectedDate: string;
    updateCycle: (updater: (prev: Cycle) => Cycle) => void;
    storageScope: StorageScope;
};

function parseTemplates(raw: string | null): DailyTemplate[] {
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw) as unknown;
        if (!Array.isArray(parsed)) return [];

        return parsed
            .map((entry): DailyTemplate | null => {
                if (!entry || typeof entry !== "object") return null;
                const template = entry as Record<string, unknown>;
                if (typeof template.id !== "string" || !template.id) return null;
                if (typeof template.name !== "string" || !template.name.trim()) return null;
                if (!Array.isArray(template.blocks)) return null;

                const blocks: DailyTemplate["blocks"] = [];
                template.blocks.forEach((rawBlock) => {
                        if (!rawBlock || typeof rawBlock !== "object") return null;
                        const block = rawBlock as Record<string, unknown>;
                        if (typeof block.title !== "string" || !block.title.trim()) return null;

                        const normalized: DailyTemplate["blocks"][number] = {
                            startTime: typeof block.startTime === "string" ? block.startTime : null,
                            endTime: typeof block.endTime === "string" ? block.endTime : null,
                            title: block.title.trim(),
                            ...(block.isFlexible === true ? { isFlexible: true } : {}),
                            ...(typeof block.linkedTargetId === "string" && block.linkedTargetId
                                ? { linkedTargetId: block.linkedTargetId }
                                : {}),
                            ...(typeof block.amount === "number" && Number.isFinite(block.amount)
                                ? { amount: Math.max(1, Math.floor(block.amount)) }
                                : {})
                        };
                        blocks.push(normalized);
                        return null;
                    });

                return {
                    id: template.id,
                    name: template.name.trim(),
                    blocks
                };
            })
            .filter((template): template is DailyTemplate => template !== null);
    } catch {
        return [];
    }
}

export function useDailyTemplates({ selectedDate, updateCycle, storageScope }: UseDailyTemplatesParams) {
    const [templates, setTemplates] = useState<DailyTemplate[]>(() => {
        return parseTemplates(readScopedStorageValue(DAILY_TEMPLATES_STORAGE_KEY, storageScope));
    });

    useEffect(() => {
        try {
            writeScopedStorageValue(DAILY_TEMPLATES_STORAGE_KEY, storageScope, JSON.stringify(templates));
        } catch (err) {
            console.error("Failed to persist templates:", err);
        }
    }, [templates, storageScope]);

    const saveAsTemplate = (name: string, dayBlocks: DailyBlock[]): boolean => {
        if (!name.trim()) return false;

        const blocks = dayBlocks.map((block) => ({
            startTime: block.startTime,
            endTime: block.endTime,
            isFlexible: block.isFlexible,
            title: block.title,
            linkedTargetId: block.linkedTargetId,
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
                isFlexible: block.isFlexible,
                title: block.title,
                linkedTargetId: block.linkedTargetId,
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
