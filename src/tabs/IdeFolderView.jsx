import { useContext } from "react";
import FolderView from "../react-local-file-system";
import Button from "@mui/material/Button";
//context
import ideContext from "../ideContext";

export default function IdeFolderView({ onFileClick, node }) {
    const { openDirectory, directoryReady, rootDirHandle } = useContext(ideContext);
    const parentHeight = node.getParent()._rect.height - node.getParent()._tabHeaderRect.height;
    // Show FolderView component only when its ready
    return directoryReady ? (
        <div style={{ height: parentHeight }}>
            <FolderView rootFolder={rootDirHandle} onFileClick={onFileClick} />
        </div>
    ) : (
        <>
            <Button onClick={openDirectory}>Open CircuitPy Drive</Button>
        </>
    );
}
