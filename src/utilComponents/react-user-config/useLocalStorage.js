import { useCallback, useEffect, useRef, useState } from "react";
import { isObject } from "./utils";

export function readStoredObject(section) {
    try {
        const value = JSON.parse(localStorage.getItem(section));
        return isObject(value) ? value : {};
    } catch {
        return {};
    }
}

function applyUpdates(snapshot, updates) {
    return updates.reduce((previous, { name, value }) => ({
        ...previous,
        [name]: typeof value === "function" ? value(previous[name]) : value,
    }), snapshot);
}

export function useLocalStorage(section, initialize = (value) => value) {
    const [localStorageState, setState] = useState(() => initialize(readStoredObject(section)));
    const initializeRef = useRef(initialize);
    initializeRef.current = initialize;
    const lastStored = useRef(localStorageState);
    // Retain updates that could not be persisted, without replaying already saved changes.
    const pending = useRef([]);
    const readLatest = useCallback(() => {
        let raw;
        try { raw = localStorage.getItem(section); }
        catch { return lastStored.current; }
        let value;
        try { value = JSON.parse(raw); } catch { value = {}; }
        lastStored.current = initializeRef.current(isObject(value) ? value : {});
        return lastStored.current;
    }, [section]);

    const setLocalStorageState = useCallback((name, value) => {
        const updates = [...pending.current, { name, value }];
        const next = applyUpdates(readLatest(), updates);
        try {
            localStorage.setItem(section, JSON.stringify(next));
            lastStored.current = next;
            pending.current = [];
        } catch (error) {
            pending.current = updates;
            console.warn("Could not persist IDE settings:", error);
        }
        setState(next);
    }, [section, readLatest]);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const onStorage = (event) => {
            if ((event.key === section || event.key === null) &&
                (!event.storageArea || event.storageArea === localStorage)) {
                setState(applyUpdates(readLatest(), pending.current));
            }
        };
        window.addEventListener("storage", onStorage);
        return () => window.removeEventListener("storage", onStorage);
    }, [section, readLatest]);

    return { localStorageState, setLocalStorageState };
}
