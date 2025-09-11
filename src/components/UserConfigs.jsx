import { useContext } from "react";
import { ConfigForms } from "../utilComponents/react-user-config";
import AppContext from "../AppContext";
import schemas from "../configs";
import TabTemplate from "../utilComponents/TabTemplate";

export default function UserConfigs() {
    const { appConfig, configTabSelection } = useContext(AppContext);
    const menuStructure = [
        {
            text: "Reset IDE",
            handler: async () => {
                if (
                    confirm(
                        "Are you sure you want to reset all settings, remove all downloaded data and reload the page?"
                    )
                ) {
                    localStorage.clear();
                    location.reload();
                    const dbs = await window.indexedDB.databases();
                    dbs.forEach((db) => {
                        window.indexedDB.deleteDatabase(db.name);
                    });
                }
            },
        },
    ];
    return (
        <TabTemplate title="Settings" menuStructure={menuStructure}>
            <ConfigForms
                schemas={schemas}
                config={appConfig.config}
                setConfig={appConfig.setConfig}
                tabValue={configTabSelection.tabValue}
                setTabValue={configTabSelection.setTabValue}
            />
        </TabTemplate>
    );
}
