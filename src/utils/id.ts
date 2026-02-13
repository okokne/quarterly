import type { Id } from "../types";

export function uid(): Id {
    return Math.random().toString(36).slice(2, 10);
}
