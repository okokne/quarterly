import { CycleAction, CycleState } from "../types";

export const cycleReducer = (state: CycleState, action: CycleAction): CycleState => {
    switch (action.type) {
        case "SET":
            return { present: action.payload, past: [], future: [] };
        case "UPDATE":
            if (!state.present) return state;
            const newPresent = action.updateFn(state.present);
            if (newPresent === state.present) return state;
            return {
                past: [...state.past.slice(-19), state.present],
                present: newPresent,
                future: []
            };
        case "UNDO":
            if (state.past.length === 0 || !state.present) return state;
            const previous = state.past[state.past.length - 1];
            const newPast = state.past.slice(0, -1);
            return {
                past: newPast,
                present: previous,
                future: [state.present, ...state.future]
            };
        case "REDO":
            if (state.future.length === 0 || !state.present) return state;
            const next = state.future[0];
            const newFuture = state.future.slice(1);
            return {
                past: [...state.past, state.present],
                present: next,
                future: newFuture
            };
        default:
            return state;
    }
};
