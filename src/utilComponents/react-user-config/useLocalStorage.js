import { useState } from "react";
// utils
import { isDefined } from "./utils";

function getLocalStorageObjects() {
    `Convert localStorage into an object.
    skip not json values`;
    const result = Object.keys(localStorage).reduce((obj, k) => {
        try {
            obj[k] = JSON.parse(localStorage.getItem(k));
        } catch {
            // skip if JSON.parse fails
        }
        return obj;
    }, {});

    return result;
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
