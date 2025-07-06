import { useState, useEffect } from "react";
import Tabtemplate from "../../Tabtemplate";

import {
    Backdrop,
    Breadcrumbs,
    CircularProgress,
    Divider,
    IconButton,
    List,
    Toolbar,
    Tooltip,
    Typography,
} from "@mui/material";

import {
    CreateNewFolderOutlined as NewFolderIcon,
    NoteAddOutlined as NewFileIcon,
    RefreshOutlined as RefreshIcon,
} from "@mui/icons-material";
import CurFolderContext from "../contexts/CurFolderContext";
import DragContext from "../contexts/DragContext";
import ContentEntry from "./ContentEntry";
import PathEntry from "./PathEntry";
import {
    getFolderContent,
    isFolder,
    addNewFile,
    addNewFolder,
    moveEntry,
    checkEntryExists,
    isEntryHealthy,
} from "../utilities/fileSystemUtils";
import { promptUniqueName, getPathEntryLabel } from "../utilities/uiUtils";

function compareFolderContent(A, B) {
    if (A.length != B.length) {
        return false;
    }
    const A_paths = A.map((entry) => {
        return entry.fullPath;
    }).sort();
    const B_paths = B.map((entry) => {
        return entry.fullPath;
    }).sort();
    for (var i = 0; i < A.length; i++) {
        if (A_paths[i] !== B_paths[i]) {
            return false;
        }
    }
    return true;
}

export default function FolderView({ rootFolder, onFileClick, additionalElement }) {
    const [currentFolderHandle, setCurrentFolderHandle] = useState(rootFolder);
    const [entryOnDrag, setEntryOnDrag] = useState();
    const [path, setPath] = useState([rootFolder]);
    const [content, setContent] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [folderTree, setFolderTree] = useState(null);
    useEffect(() => {
        async function showRoot() {
            setCurrentFolderHandle(rootFolder);
            setContent(await getFolderContent(rootFolder));
            setPath([rootFolder]);
        }
        showRoot();
    }, [rootFolder]);

    useEffect(() => {
        const interval = setInterval(async () => {
            // console.log("periodic refresh");
            await showFolderView(currentFolderHandle);
        }, 1000);
        return () => clearInterval(interval);
    }, [content, currentFolderHandle]);

    async function showFolderView(folderHandle) {
        const healthy = await isEntryHealthy(folderHandle);
        if (!healthy) {
            await showFolderView(rootFolder);
            return;
        }
        // set context
        setCurrentFolderHandle(folderHandle);
        // set content
        const curContent = await getFolderContent(folderHandle, true);
        if (compareFolderContent(curContent, content)) {
            return;
        }
        setContent(curContent);
        // set path
        // if folderHandle in path, cut what ever behind it
        for (var i = 0; i < path.length; i++) {
            if (await folderHandle.isSameEntry(path[i])) {
                setPath((curPath) => {
                    return curPath.slice(0, i + 1);
                });
                return;
            }
        }
        // else, append folderHandle at the back
        setPath((curPath) => {
            return [...curPath, folderHandle];
        });
        console.log("Folder view updated");
    }

    async function handleDrop(targetFolder) {
        if (await targetFolder.isSameEntry(entryOnDrag)) {
            return;
        }
        if (await targetFolder.isSameEntry(currentFolderHandle)) {
            return;
        }
        if (await checkEntryExists(targetFolder, entryOnDrag.name)) {
            alert('"' + entryOnDrag.name + '" conflicts with another name in the target folder.');
            return;
        }
        setIsLoading(true);
        await moveEntry(currentFolderHandle, entryOnDrag, targetFolder);
        await showFolderView(currentFolderHandle);
        setIsLoading(false);
    }

    const menuStructure = [
        {
            label: "New",
            options: [
                {
                    text: "File",
                    handler: async (event) => {
                        console.log("FolderView new file called", event);
                        const newName = await promptUniqueName(currentFolderHandle, "New file name:", "");
                        if (!newName) {
                            return;
                        }
                        setIsLoading(true);
                        const newFileHandle = await addNewFile(currentFolderHandle, newName);
                        await showFolderView(currentFolderHandle);
                        setIsLoading(false);
                        newFileHandle.fullPath = (currentFolderHandle.fullPath || "") + "/" + newFileHandle.name;
                        onFileClick(newFileHandle);
                    },
                },
                {
                    text: "Folder",
                    handler: async (event) => {
                        console.log("FolderView new folder called", event);
                        const newName = await promptUniqueName(currentFolderHandle, "New folder name:", "");
                        if (!newName) {
                            return;
                        }
                        setIsLoading(true);
                        await addNewFolder(currentFolderHandle, newName);
                        await showFolderView(currentFolderHandle);
                        setIsLoading(false);
                    },
                },
            ],
        },
        ...additionalElement,
    ];

    return (
        <Tabtemplate title="Folder View" menuStructure={menuStructure}>
            <div
                style={{
                    height: "100%",
                    width: "100%",
                    maxHeight: "100%",
                    maxWidth: "100%",
                    display: "flex",
                    flexDirection: "column",
                }}
            >
                <div
                    style={{
                        flexGrow: 0,
                    }}
                >
                    <CurFolderContext.Provider
                        value={{ currentFolderHandle, onFileClick, showFolderView, setIsLoading }}
                    >
                        <DragContext.Provider value={{ setEntryOnDrag, handleDrop }}>
                            <Breadcrumbs aria-label="breadcrumb">
                                {path.map((entry) => (
                                    <PathEntry entryHandle={entry} key={"local_file_system_path_key_" + entry.name} />
                                ))}
                            </Breadcrumbs>
                        </DragContext.Provider>
                    </CurFolderContext.Provider>
                    <Divider />
                </div>
                <div
                    style={{
                        flexGrow: 1,
                        overflow: "auto",
                    }}
                >
                    <CurFolderContext.Provider
                        value={{ currentFolderHandle, onFileClick, showFolderView, setIsLoading }}
                    >
                        <DragContext.Provider value={{ setEntryOnDrag, handleDrop }}>
                            <List>
                                {content
                                    .sort((a, b) => {
                                        if (a.isParent && !b.isParent) {
                                            return -1;
                                        }
                                        if (!a.isParent && b.isParent) {
                                            return 1;
                                        }
                                        if (isFolder(a) && !isFolder(b)) {
                                            return -1;
                                        }
                                        if (!isFolder(a) && isFolder(b)) {
                                            return 1;
                                        }
                                        if (a.name < b.name) {
                                            return -1;
                                        }
                                        if (a.name > b.name) {
                                            return 1;
                                        }
                                        return 0;
                                    })
                                    .filter((entry) => {
                                        return !entry.name.startsWith(".");
                                    })
                                    .map((entry) => (
                                        <ContentEntry
                                            entryHandle={entry}
                                            key={"file_system_content_key_" + entry.name}
                                        />
                                    ))}
                            </List>
                        </DragContext.Provider>
                    </CurFolderContext.Provider>
                </div>
                <div
                    style={{
                        flexGrow: 0,
                    }}
                >
                    <Divider />
                </div>
                <Backdrop sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.drawer + 1 }} open={isLoading}>
                    <CircularProgress color="inherit" />
                </Backdrop>
            </div>
        </Tabtemplate>
    );
}
