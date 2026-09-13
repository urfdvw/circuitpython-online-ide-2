import React from "react";
import { harness } from "./helpers/harness.js";
import useConfig from "../src/utilComponents/react-user-config/useConfig";
import schemas from "../src/configs";
const t = harness("settings recovery and updates");
const internal = React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentDispatcher;
const originalDispatcher = internal.current;
const originalStorage = globalThis.localStorage;
let storageValue = "{invalid json";
let blocked = false;
const slots = [];
let cursor = 0;
try {
    globalThis.localStorage = {
        getItem: () => storageValue,
        setItem: (key, value) => { if (blocked) throw new Error("Quota exceeded"); storageValue = value; },
    };
    internal.current = {
        useState: (initial) => {
            const index = cursor++;
            if (!(index in slots)) slots[index] = typeof initial === "function" ? initial() : initial;
            return [slots[index], (value) => { slots[index] = value; }];
        },
        useRef: (initial) => {
            const index = cursor++;
            if (!(index in slots)) slots[index] = { current: initial };
            return slots[index];
        },
        useCallback: (callback) => callback,
        useEffect: () => {},
    };
    const render = () => {
        cursor = 0;
        // The test dispatcher supplies React's hook lifecycle without a DOM.
        // eslint-disable-next-line react-hooks/rules-of-hooks
        return useConfig(schemas);
    };
    let config = render();
    t.check("malformed storage still initializes every schema", config.ready && schemas.every((s) => config.config[s.name]));
    config.setConfigField("general", "theme", "dark");
    config.setConfigField("serial_console", "font", 16);
    config = render();
    t.check("consecutive updates retain both sections", config.config.general.theme === "dark" && config.config.serial_console.font === 16);
    config.setConfigField("general", "theme", "invalid-theme");
    config.setConfig("editor", null);
    config = render();
    t.check("invalid enum values fall back to schema defaults", config.config.general.theme !== "invalid-theme");
    t.check("null configuration is repaired", typeof config.config.editor.font === "number");
    blocked = true;
    config.setConfigField("general", "theme", "light");
    config = render();
    t.check("settings remain usable if persistence fails", config.config.general.theme === "light");
    for (const bad of ["null", "[]", '"hello"']) {
        slots.length = 0;
        storageValue = bad;
        config = render();
        t.check(`invalid stored shape ${bad} falls back to defaults`, config.ready && !!config.config.editor);
    }
} catch (error) { t.fail("unexpected error", error); }
finally { internal.current = originalDispatcher; globalThis.localStorage = originalStorage; }
t.done();
