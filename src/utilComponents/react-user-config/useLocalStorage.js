import { useCallback, useRef, useState } from "react";
import { isObject } from "./utils";

export function readStoredObject(section) {
    try {
        const value = JSON.parse(localStorage.getItem(section));
        return isObject(value) ? value : {};
    } catch {
        // Missing, malformed, or unavailable storage falls back to defaults.
        return {};
    }
}

export function useLocalStorage(section, initialize = (value) => value) {
    const [localStorageState, setState] = useState(() => initialize(readStoredObject(section)));
    const current = useRef(localStorageState);

    const setLocalStorageState = useCallback((name, value) => {
        const previous = current.current;
        const nextValue = typeof value === "function" ? value(previous[name]) : value;
        const next = { ...previous, [name]: nextValue };
        // Keep settings usable for this session when persistence is blocked or full.
        try {
            localStorage.setItem(section, JSON.stringify(next));
        } catch (error) {
            console.warn("Could not persist IDE settings:", error);
        }
        current.current = next;
        setState(next);
    }, [section]);

    return { localStorageState, setLocalStorageState };
}
