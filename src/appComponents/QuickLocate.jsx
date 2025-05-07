import TabToolBar from "../utilComponents/TabToolBar";
import { selectTabById } from "../layout/layoutUtils";
import { useContext } from "react";
import AppContext from "../AppContext";

export default function QuickLocate() {
    const { helpTabSelection, flexModel } = useContext(AppContext);
    const tools = [
        {
            text: "Help",
            handler: () => {
                selectTabById(flexModel, "help_tab");
                helpTabSelection.setTabName("quick_locate");
            },
        },
    ];
    const hiddenTools = [
        {
            text: "A Hidden Tool",
            handler: () => {
                console.log("hidden tool example");
            },
        },
    ];
    return <TabToolBar title="快速投影" tools={tools} hiddenTools={hiddenTools} />;
}
