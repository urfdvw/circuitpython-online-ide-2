import { useHotkeys } from "react-hotkeys-hook";
import { Actions } from "flexlayout-react";
import { toggleSelectTabById } from "../layout/layoutUtils";

export default function useLayoutHotKeys(flexModel) {
    const hint_tab_ids = ["quick_locate_tab", "bible_menu_tab", "search_tab", "history_tab", "notes_tab"];
    useHotkeys("alt+q", () => {
        console.log("hotkey: show quick_locate_tab");
        toggleSelectTabById(flexModel, "quick_locate_tab");
    });
    useHotkeys("alt+m", () => {
        console.log("hotkey: show bible_menu_tab");
        toggleSelectTabById(flexModel, "bible_menu_tab");
    });
    useHotkeys("alt+s", () => {
        console.log("hotkey: show search_tab");
        toggleSelectTabById(flexModel, "search_tab");
    });
    useHotkeys("alt+h", () => {
        console.log("hotkey: show history_tab");
        toggleSelectTabById(flexModel, "history_tab");
    });
    useHotkeys("alt+n", () => {
        console.log("hotkey: show notes_tab");
        toggleSelectTabById(flexModel, "notes_tab");
    });
    useHotkeys(
        "alt",
        () => {
            console.log("SHOW_HINT");
            for (const tab_id of hint_tab_ids) {
                const tab = flexModel.getNodeById(tab_id);
                flexModel.doAction(
                    Actions.updateNodeAttributes(tab_id, {
                        name: tab.attributes.altName,
                    })
                );
            }
        },
        { keyup: false, keydown: true }
    );
    useHotkeys(
        "alt",
        () => {
            console.log("HIDE_HINT");
            for (const tab_id of hint_tab_ids) {
                const tab = flexModel.getNodeById(tab_id);
                flexModel.doAction(
                    Actions.updateNodeAttributes(tab_id, {
                        name: tab.attributes.helpText,
                    })
                );
            }
        },
        { keyup: true, keydown: false }
    );
}
