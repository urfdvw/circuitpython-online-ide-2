import Placeholder from "../components/Placeholder";
import UserConfigs from "../components/UserConfigs";
import Help from "../components/Help";
import IdeFolderView from "../components/IdeFolderView";
import IdeEditor from "../components/IdeEditor";
import Navigation from "../components/Navigation";
import SerialConsole from "../components/SerialConsole";
import DocCam from "../components/DocCam";
import Backup from "../components/Backup";
import SerialPlotter from "../components/SerialPlotter";
import LibManagement from "../components/LibManagement";
import Debugger from "../components/Debugger";

const fullSize = { height: "100%", width: "100%" };

const Factory = (node) => {
    var component = node.getComponent();
    if (component === "placeholder") {
        return (
            <div className="tab_content" style={fullSize}>
                <Placeholder node={node} />
            </div>
        );
    } else if (component === "config") {
        return (
            <div className="tab_content" style={fullSize}>
                <UserConfigs />
            </div>
        );
    } else if (component === "help") {
        return (
            <div className="tab_content" style={fullSize}>
                <Help />
            </div>
        );
    } else if (component === "folder_view") {
        return (
            <div className="tab_content" style={fullSize}>
                <IdeFolderView node={node} />
            </div>
        );
    } else if (component === "editor") {
        return (
            <div className="tab_content" style={fullSize}>
                <IdeEditor node={node} />
            </div>
        );
    } else if (component === "navigation") {
        return (
            <div className="tab_content">
                <Navigation />
            </div>
        );
    } else if (component === "serial_raw") {
        return (
            <div className="tab_content" style={fullSize}>
                <SerialConsole />
            </div>
        );
    } else if (component === "doc_cam") {
        return (
            <div className="tab_content" style={fullSize}>
                <DocCam />
            </div>
        );
    } else if (component === "backup") {
        return (
            <div className="tab_content" style={fullSize}>
                <Backup />
            </div>
        );
    } else if (component === "plot") {
        return (
            <div className="tab_content" style={fullSize}>
                <SerialPlotter node={node} />
            </div>
        );
    } else if (component === "lib_management") {
        return (
            <div className="tab_content" style={fullSize}>
                <LibManagement />
            </div>
        );
    } else if (component === "debugger") {
        return (
            <div className="tab_content" style={fullSize}>
                <Debugger />
            </div>
        );
    }
};

export default Factory;
