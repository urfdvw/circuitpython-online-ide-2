import FolderView from "react-local-file-system";
import Button from "@mui/material/Button";

export default function IdeFolderView({ onFileClick, openDirectory, directoryReady, rootDirHandle }) {
    // Show FolderView component only when its ready
    return directoryReady ? (
        <FolderView rootFolder={rootDirHandle} onFileClick={onFileClick} />
    ) : (
        <>
            <Button onClick={openDirectory}>Open CircuitPy Drive</Button>
        </>
    );
}
