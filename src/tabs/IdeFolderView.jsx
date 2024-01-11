import { useContext } from "react";
import FolderView from "../react-local-file-system";
import Button from "@mui/material/Button";
//context
import ideContext from "../ideContext";

export default function IdeFolderView({ onFileClick }) {
    const { openDirectory, directoryReady, rootDirHandle } = useContext(ideContext);
    // Show FolderView component only when its ready
    return directoryReady ? (
        <FolderView rootFolder={rootDirHandle} onFileClick={onFileClick} />
    ) : (
        <>
            <Button onClick={openDirectory}>Open CircuitPy Drive</Button>
        </>
    );
}
