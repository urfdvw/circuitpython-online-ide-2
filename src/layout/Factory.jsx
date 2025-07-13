import Placeholder from "../components/Placeholder";
import UserConfigs from "../components/UserConfigs";
import Help from "../components/Help";
import IdeFolderView from "../components/IdeFolderView";
import IdeEditor from "../components/IdeEditor";
import Navigation from "../components/Navigation";
import RawConsole from "../components/RawConsole";
import DocCam from "../components/DocCam";
import Backup from "../components/Backup";
import RawPlotter from "../components/RawPlotter";

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
                <RawConsole />
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
                <RawPlotter node={node} />
            </div>
        );
    }
};

export default Factory;
