import { useState } from "react";

export function useTabValueName(pages) {
    const [tabValue, _setTabValue] = useState(0);
    const [tabName, _setTabName] = useState(pages[0].name);

    function setTabValue(value) {
        if (!(value >= 0 && value < pages.length)) {
            value = 0;
        }
        _setTabValue(value);
        _setTabName(pages[value].name);
    }

    function setTabName(name) {
        if (
            !pages
                .map((page) => {
                    return page.name;
                })
                .includes(name)
        ) {
            name = pages[0].name;
        }
        _setTabName(name);
        _setTabValue(
            pages
                .map((page, index) => {
                    return { name: page.name, index: index };
                })
                .filter((page) => {
                    return page.name === name;
                })[0].index
        );
    }

    return { tabValue, setTabValue, tabName, setTabName };
}
