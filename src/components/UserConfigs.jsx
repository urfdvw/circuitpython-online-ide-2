import { useContext } from "react";
import { ConfigForms } from "../utilComponents/react-user-config";
import AppContext from "../AppContext";
import schemas from "../configs";

export default function UserConfigs() {
    const { appConfig, configTabSelection } = useContext(AppContext);
    return (
        <ConfigForms
            schemas={schemas}
            config={appConfig.config}
            setConfig={appConfig.setConfig}
            tabValue={configTabSelection.tabValue}
            setTabValue={configTabSelection.setTabValue}
        />
    );
}
