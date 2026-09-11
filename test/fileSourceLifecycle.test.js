import React from "react";
import { harness } from "./helpers/harness.js";
import useFileSource from "../src/hooks/useFileSource";

const t = harness("file source render lifecycle");
// Execute the real hook with persistent hook slots across renders. Effects are
// irrelevant here: we check the callback consumed by Backup's schedule effects.
const slots = [];
let cursor = 0;
const memo = (factory, deps) => {
    const i = cursor++;
    if (!slots[i] || deps.some((d, j) => !Object.is(d, slots[i].deps[j]))) {
        slots[i] = { value: factory(), deps };
    }
    return slots[i].value;
};
const dispatcher = {
    useMemo: memo,
    useCallback: (fn, deps) => memo(() => fn, deps),
    useRef: (value) => memo(() => ({ current: value }), []),
    useState: (value) => memo(() => [typeof value === "function" ? value() : value, () => {}], []),
    useEffect: () => { cursor++; },
};
const internal = React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentDispatcher;
const previous = internal.current;
try {
    internal.current = dispatcher;
    const serial = { port: {}, writer: {} };
    const config = { general: { file_source: "usb_mass_storage" } };
    const render = (ready = true) => {
        cursor = 0;
        // The test dispatcher above supplies the hook lifecycle without a DOM.
        // eslint-disable-next-line react-hooks/rules-of-hooks
        return useFileSource(serial, ready, { config, setConfigField() {} });
    };
    const first = render();
    for (let i = 0; i < 10; i++) {
        t.check(`serial output render ${i + 1} preserves backup timer callback`, first.batchFileOps === render().batchFileOps);
    }
    config.general.file_source = "usb_serial";
    const serialFiles = render();
    t.check("changing file source updates the batch callback", serialFiles.batchFileOps !== first.batchFileOps);
    t.check("serial source callback is stable too", serialFiles.batchFileOps === render().batchFileOps);
    serial.writer = {};
    t.check("reconnection supplies a fresh root handle", render().rootDirHandle !== serialFiles.rootDirHandle);
    serial.keepRunning = false;
    t.check("disconnect before React readiness updates is safe", render().rootDirHandle === null);
} catch (error) {
    t.fail("unexpected error", error);
} finally {
    internal.current = previous;
}
t.done();
