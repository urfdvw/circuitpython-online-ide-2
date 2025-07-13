import { useState } from "react";
// utils
import { isDefined } from "./utils";

function getLocalStorageObjects() {
    `Convert localStorage into an object.
    
    If anything unexpected happens,
    clear the storage and return empty object.`;
    // https://codereview.stackexchange.com/a/273991
    try {
        return Object.keys(localStorage).reduce((obj, k) => ({ ...obj, [k]: JSON.parse(localStorage.getItem(k)) }), {});
    } catch {
        console.warn("LocalStorage contents cannot be converted to objects. bleached.");
        localStorage.clear();
        return {};
    }
}

export function useLocalStorage(section) {
    const [localStorageState, _setLocalStorageState] = useState({});
    function initLocalStorageState() {
        getLocalStorageObjects(); // if anything wrong with localStorage, bleach it
        if (!isDefined(localStorage.getItem(section))) {
            localStorage.setItem(section, JSON.stringify({}));
        }
        _setLocalStorageState(getLocalStorageObjects()[section]);
    }

    function setLocalStorageState(name, value) {
        localStorage.setItem(
            section,
            JSON.stringify({
                ...JSON.parse(localStorage.getItem(section)),
                [name]: value,
            })
        );
        _setLocalStorageState(getLocalStorageObjects()[section]);
    }

    return { localStorageState, setLocalStorageState, initLocalStorageState };
}
