import * as FlexLayout from "flexlayout-react";
import Placeholder from "../appComponents/placeholder";
import UserConfigs from "../appComponents/UserConfigs";
import Help from "../appComponents/Help";
import IdeFolderView from "../appComponents/IdeFolderView";

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
    }
    return <FlexLayout.Layout model={model} factory={Factory} />;
};

export default Factory;
