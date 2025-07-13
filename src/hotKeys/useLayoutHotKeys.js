import { useHotkeys } from "react-hotkeys-hook";
import { Actions } from "flexlayout-react";
import { toggleSelectTabById } from "../layout/layoutUtils";

export default function useLayoutHotKeys(flexModel) {
    const hint_tab_ids = ["help_tab"];
    useHotkeys("alt+h", () => {
        console.log("hotkey: show help_tab");
        toggleSelectTabById(flexModel, "help_tab");
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
