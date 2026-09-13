import React from "react";

// Execute real hooks with persistent state and effect cleanup, without browser APIs.
export function renderHook(callback) {
    const internal = React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentDispatcher;
    const slots = [];
    let cursor;
    let dirty;
    let props;
    let result;
    let effects;
    let disposed = false;
    const changed = (before, after) => !before || !after || before.length !== after.length || after.some((x, i) => !Object.is(x, before[i]));
    const memo = (factory, deps) => {
        const index = cursor++;
        if (!slots[index] || changed(slots[index].deps, deps)) slots[index] = { value: factory(), deps };
        return slots[index].value;
    };
    const dispatcher = {
        useState(initial) {
            const index = cursor++;
            if (!slots[index]) {
                slots[index] = { value: typeof initial === "function" ? initial() : initial };
                slots[index].set = (value) => {
                    if (disposed) return;
                    const next = typeof value === "function" ? value(slots[index].value) : value;
                    if (!Object.is(next, slots[index].value)) { slots[index].value = next; dirty = true; }
                };
            }
            return [slots[index].value, slots[index].set];
        },
        useRef: (initial) => memo(() => ({ current: initial }), []),
        useCallback: (fn, deps) => memo(() => fn, deps),
        useMemo: memo,
        useEffect(fn, deps) {
            const index = cursor++;
            if (!slots[index] || changed(slots[index].deps, deps)) {
                const previous = slots[index];
                const slot = { deps };
                slots[index] = slot;
                effects.push(() => { previous?.cleanup?.(); slot.cleanup = fn(); });
            }
        },
    };
    return {
        render(nextProps = props) {
            props = nextProps;
            for (let pass = 0; pass < 25; pass++) {
                dirty = false; cursor = 0; effects = [];
                const previous = internal.current;
                internal.current = dispatcher;
                try { result = callback(props); }
                finally { internal.current = previous; }
                effects.forEach((effect) => effect());
                if (!dirty) return result;
            }
            throw new Error("Hook render did not settle.");
        },
        unmount() { disposed = true; slots.forEach((slot) => slot.cleanup?.()); },
    };
}

export const flushEffects = () => new Promise((resolve) => setImmediate(resolve));
