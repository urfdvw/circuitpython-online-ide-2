import { useContext } from "react";
import FolderView from "../utilComponents/react-local-file-system";
import Button from "@mui/material/Button";
//context
import AppContext from "../AppContext";

export default function IdeFolderView({ node }) {
    const { openDirectory, rootFolderDirectoryReady, rootDirHandle, onFileClick } = useContext(AppContext);
    // Show FolderView component only when its ready
    return rootFolderDirectoryReady ? (
        <div style={{ height: "100%" }}>
            <FolderView rootFolder={rootDirHandle} onFileClick={onFileClick} />
        </div>
    ) : (
        <>
            <Button onClick={openDirectory}>Open CircuitPy Drive</Button>
        </>
    );
}
