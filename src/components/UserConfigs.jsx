import { useContext } from "react";
import { ConfigForms } from "../utilComponents/react-user-config";
import AppContext from "../AppContext";
import schemas from "../configs";
import TabTemplate from "../utilComponents/TabTemplate";

export default function UserConfigs() {
    const { appConfig, configTabSelection } = useContext(AppContext);
    const menuStructure = [
        {
            text: "Reset to default",
            handler: () => {
                if (confirm("Are you sure you want to reset all settings and reload the page?")) {
                    localStorage.clear();
                    location.reload();
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
