import { useState, useEffect, useCallback, useRef } from "react";
import TabTemplate from "../../TabTemplate";

import {
    Backdrop,
    Breadcrumbs,
    CircularProgress,
    Divider,
    List,
} from "@mui/material";


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
    isSameEntrySafe,
} from "../utilities/fileSystemUtils";
import { promptUniqueName } from "../utilities/uiUtils";

function compareFolderContent(A, B) {
    if (A.length != B.length) {
        return false;
    }
    const A_paths = A.map((entry) => {
        return `${entry.kind}:${entry.fullPath}`;
    }).sort();
    const B_paths = B.map((entry) => {
        return `${entry.kind}:${entry.fullPath}`;
    }).sort();
    for (var i = 0; i < A.length; i++) {
        if (A_paths[i] !== B_paths[i]) {
            return false;
        }
    }
    return true;
}

// Serial file access uses explicit refreshes because polling interrupts board code.
export default function FolderView({ rootFolder, onFileClick, additionalElement = [], autoRefresh = true, onRefresh }) {
    const [currentFolderHandle, setCurrentFolderHandle] = useState(rootFolder);
    const [entryOnDrag, setEntryOnDrag] = useState();
    const [path, setPath] = useState([rootFolder]);
    const [content, setContent] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const requestId = useRef(0);
    const operationPending = useRef(false);

    const showFolderView = useCallback(async (folderHandle) => {
        const request = ++requestId.current;
        try {
            if (!(await isEntryHealthy(folderHandle))) {
                folderHandle = rootFolder;
                if (!(await isEntryHealthy(folderHandle))) {
                    if (request === requestId.current) {
                        setContent([]);
                        setPath([rootFolder]);
                    }
                    return;
                }
            }
            const entries = await getFolderContent(folderHandle, true);
            if (request !== requestId.current) return;
            const nextPath = [];
            for (let entry = folderHandle; entry; entry = entry.parent) {
                nextPath.unshift(entry);
            }
            setCurrentFolderHandle(folderHandle);
            setContent((previous) => compareFolderContent(previous, entries) ? previous : entries);
            setPath(nextPath);
        } catch (error) {
            if (request === requestId.current) console.warn("Could not refresh folder:", error);
        }
    }, [rootFolder]);

    useEffect(() => {
        setCurrentFolderHandle(rootFolder);
        setContent([]);
        setPath([rootFolder]);
        showFolderView(rootFolder);
        return () => { requestId.current = requestId.current + 1; };
    }, [rootFolder, showFolderView]);

    useEffect(() => {
        if (!autoRefresh) return;
        let cancelled = false;
        let timer;
        const poll = async () => {
            if (!operationPending.current) await showFolderView(currentFolderHandle);
            if (!cancelled) timer = setTimeout(poll, 1000);
        };
        timer = setTimeout(poll, 1000);
        return () => {
            cancelled = true;
            clearTimeout(timer);
            requestId.current = requestId.current + 1;
        };
    }, [currentFolderHandle, autoRefresh, showFolderView]);

    async function runOperation(operation) {
        if (operationPending.current) return;
        operationPending.current = true;
        setIsLoading(true);
        try {
            const result = await operation();
            await showFolderView(currentFolderHandle);
            return result;
        } catch (error) {
            alert("File operation failed. " + error.message);
        } finally {
            operationPending.current = false;
            setIsLoading(false);
        }
    }

    async function handleDrop(targetFolder) {
        if (!entryOnDrag) return;
        await runOperation(async () => {
            if (await isSameEntrySafe(targetFolder, entryOnDrag) ||
                await isSameEntrySafe(targetFolder, currentFolderHandle)) return;
            if (await checkEntryExists(targetFolder, entryOnDrag.name)) {
                throw new Error(`"${entryOnDrag.name}" already exists in the target folder.`);
            }
            await moveEntry(currentFolderHandle, entryOnDrag, targetFolder);
            setEntryOnDrag(null);
        });
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
                        await runOperation(async () => {
                            const file = await addNewFile(currentFolderHandle, newName);
                            file.fullPath = (currentFolderHandle.fullPath || "") + "/" + file.name;
                            onFileClick(file);
                        });
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
                        await runOperation(() => addNewFolder(currentFolderHandle, newName));
                    },
                },
            ],
        },
        ...(autoRefresh
            ? []
            : [
                  {
                      text: "\u27F3",
                      handler: () => runOperation(async () => { await onRefresh?.(); }),
                  },
              ]),
        ...additionalElement,
    ];

    return (
        <TabTemplate title="Folder View" menuStructure={menuStructure}>
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
                        value={{ currentFolderHandle, onFileClick, showFolderView, runOperation }}
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
                        value={{ currentFolderHandle, onFileClick, showFolderView, runOperation }}
                    >
                        <DragContext.Provider value={{ setEntryOnDrag, handleDrop }}>
                            <List>
                                {[...content]
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
        </TabTemplate>
    );
}
