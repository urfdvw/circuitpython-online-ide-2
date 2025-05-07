import { useContext } from "react";
import { ConfigForms } from "react-user-config";
import AppContext from "../AppContext";
import schemas from "../configs";

export default function UserConfigs() {
    const { appConfig } = useContext(AppContext);
    return <ConfigForms schemas={schemas} config={appConfig.config} setConfig={appConfig.setConfig} />;
}
